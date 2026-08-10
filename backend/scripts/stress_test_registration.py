import asyncio
import time
import httpx
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.security import create_access_token

async def register_user(client, token, index):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "full_name": f"Enfermeiro Teste {index}",
        "email": f"enfermeiro{index}@test.com",
        "password": "StrongPassword123!",
        "role": "CLINICAL"
    }
    try:
        response = await client.post("http://localhost:8000/api/v1/auth/users", json=payload, headers=headers)
        return response.status_code
    except Exception as e:
        return str(e)

async def main():
    # Generate admin token (assuming user ID 1 is an admin, which we verified)
    token = create_access_token("1")
    
    print("Starting stress test for 50 concurrent user registrations...")
    start_time = time.time()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [register_user(client, token, i) for i in range(1, 51)]
        results = await asyncio.gather(*tasks)
    
    end_time = time.time()
    total_time = end_time - start_time
    
    print(f"Total Execution Time: {total_time:.2f} seconds")
    print("Status Codes returned:")
    
    # Count results
    counts = {}
    for res in results:
        counts[res] = counts.get(res, 0) + 1
        
    for status, count in counts.items():
        print(f"  {status}: {count}")

if __name__ == "__main__":
    asyncio.run(main())
