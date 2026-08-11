import sys
import os

# Ensure the app module can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, or_, not_, update, delete
from app.database import SessionLocal
from app.models import User, FluidRecord, VitalSignRecord

def purge_test_users():
    db = SessionLocal()
    try:
        # 1. Query Target Users
        # Include if email ends in @test.com or full_name/username contains teste
        # Exclude real users and valid email domains
        target_condition = or_(
            User.email.ilike("%@test.com%"),
            User.full_name.ilike("%Enfermeiro Teste%"),
            User.full_name.ilike("%Teste%"),
            User.username.ilike("%teste%")
        )
        
        exclusion_condition = or_(
            User.email.ilike("%@gmail.com%"),
            User.email.ilike("%@hotmail.com%"),
            User.email.ilike("%@hidrocare.com%"),  # Assuming hospital domain
            User.username.in_(["joao", "millena", "admin", "joao.braga", "millena.braga", "teste"]) # let's be safe
        )

        users_to_delete = db.execute(
            select(User).where(target_condition).where(not_(exclusion_condition))
        ).scalars().all()

        if not users_to_delete:
            print("No test users found to purge.")
            return

        print("The following test users will be purged:")
        print(f"{'ID':<5} | {'Username':<20} | {'Full Name':<30} | {'Email':<30}")
        print("-" * 90)
        
        user_ids = []
        for u in users_to_delete:
            print(f"{u.id:<5} | {u.username:<20} | {u.full_name:<30} | {u.email:<30}")
            user_ids.append(u.id)
            
        print("-" * 90)
        
        # 2. Cleanup orphaned records
        # If test users created records, delete those records to prevent FK violations
        # (Alternatively, we could set registered_by_id = admin.id, but deleting is safer for test data)
        db.execute(delete(FluidRecord).where(FluidRecord.registered_by_id.in_(user_ids)))
        db.execute(delete(VitalSignRecord).where(VitalSignRecord.registered_by_id.in_(user_ids)))
        
        # If test users updated any records, set updated_by_id to None
        db.execute(update(FluidRecord).where(FluidRecord.updated_by_id.in_(user_ids)).values(updated_by_id=None))
        db.execute(update(VitalSignRecord).where(VitalSignRecord.updated_by_id.in_(user_ids)).values(updated_by_id=None))
        
        # 3. Delete users
        db.execute(delete(User).where(User.id.in_(user_ids)))
        
        db.commit()
        print(f"Successfully purged {len(user_ids)} test users and their records.")
        
    except Exception as e:
        db.rollback()
        print(f"Failed to purge test users due to an error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    purge_test_users()
