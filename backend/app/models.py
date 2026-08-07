import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, column, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import expression

from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CLINICAL = "CLINICAL"


class FluidType(str, enum.Enum):
    ORAL_DIET = "ORAL_DIET"
    ENTERAL_DIET = "ENTERAL_DIET"
    IV_HYDRATION = "IV_HYDRATION"
    MEDICATION = "MEDICATION"
    TRANSFUSION = "TRANSFUSION"
    OTHER_INPUT = "OTHER_INPUT"
    URINE = "URINE"
    DRAIN = "DRAIN"
    SNE_SNG = "SNE_SNG"
    VOMIT = "VOMIT"
    STOOL = "STOOL"
    OTHER_OUTPUT = "OTHER_OUTPUT"
    # Legacy alias for backward compatibility
    OTHER = "OTHER_OUTPUT"


class FluidDirection(str, enum.Enum):
    INPUT = "INPUT"
    OUTPUT = "OUTPUT"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CLINICAL)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    records: Mapped[list["FluidRecord"]] = relationship(back_populates="registered_by", foreign_keys="FluidRecord.registered_by_id")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    medical_record: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    birth_date: Mapped[date] = mapped_column(Date)
    uti: Mapped[str] = mapped_column(String(50), nullable=False, server_default="UTI 1", index=True)
    bed: Mapped[str] = mapped_column(String(50), nullable=False, server_default="01", index=True)
    health_insurance: Mapped[str] = mapped_column(String(100), default="SUS")
    is_admitted: Mapped[bool] = mapped_column(default=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    records: Mapped[list["FluidRecord"]] = relationship(back_populates="patient", cascade="all, delete-orphan")
    vital_signs: Mapped[list["VitalSignRecord"]] = relationship(back_populates="patient", cascade="all, delete-orphan")


class FluidRecord(Base):
    __tablename__ = "fluid_records"
    __table_args__ = (
        Index("ix_fluid_patient_occurrence", "patient_id", "occurred_at"),
        Index(
            "uq_fluid_single_value_category",
            "patient_id",
            "occurred_at",
            "category",
            unique=True,
            postgresql_where=column("category").in_([
                "IV_HYDRATION",
                "URINE",
                "SNE_SNG",
                "DRAIN",
                "STOOL",
            ]),
            sqlite_where=column("category").in_([
                "IV_HYDRATION",
                "URINE",
                "SNE_SNG",
                "DRAIN",
                "STOOL",
            ]),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    registered_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    direction: Mapped[FluidDirection] = mapped_column(Enum(FluidDirection), nullable=False)
    category: Mapped[FluidType] = mapped_column(Enum(FluidType), nullable=False)
    volume_ml: Mapped[float | None] = mapped_column(Float, nullable=True)
    qualitative_value: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="records")
    registered_by: Mapped[User] = relationship(back_populates="records", foreign_keys=[registered_by_id])
    updated_by: Mapped["User | None"] = relationship(foreign_keys=[updated_by_id])


class VitalSignRecord(Base):
    __tablename__ = "vital_sign_records"
    __table_args__ = (
        Index("ix_vital_patient_occurrence", "patient_id", "occurred_at"),
        UniqueConstraint("patient_id", "occurred_at", name="uq_patient_vitals_time"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    registered_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pulse: Mapped[int | None] = mapped_column(Integer)
    blood_pressure: Mapped[str | None] = mapped_column(String(20))
    temperature: Mapped[float | None] = mapped_column(Float)
    respiration: Mapped[int | None] = mapped_column(Integer)
    spo2: Mapped[int | None] = mapped_column(Integer)
    hgt: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="vital_signs")
    registered_by: Mapped[User] = relationship(foreign_keys=[registered_by_id])
    updated_by: Mapped["User | None"] = relationship(foreign_keys=[updated_by_id])
