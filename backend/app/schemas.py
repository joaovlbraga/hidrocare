from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import FluidDirection, FluidType, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr | None = None
    phone: str | None = None
    role: UserRole
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    full_name: str = Field(min_length=3, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=8, max_length=72)
    role: UserRole = UserRole.CLINICAL

    @field_validator("email", "phone", mode="before")
    @classmethod
    def validate_empty_strings(cls, v: str | None) -> str | None:
        if v is not None and str(v).strip() == "":
            return None
        return v


class PasswordResetRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=72)


class UpdateOwnPasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class PatientCreate(BaseModel):
    medical_record: str = Field(min_length=1, max_length=60)
    full_name: str = Field(min_length=3, max_length=150)
    birth_date: date
    uti: Literal["UTI 1", "UTI 2"] = Field(default="UTI 1")
    bed: str = Field(min_length=1, max_length=50)
    health_insurance: str = Field(default="SUS", min_length=1, max_length=100)

    @field_validator("full_name", mode="before")
    @classmethod
    def sanitize_full_name(cls, v: str) -> str:
        return str(v).strip()

    @field_validator("bed", mode="before")
    @classmethod
    def validate_bed(cls, v: str) -> str:
        s = str(v).strip()
        if not s:
            raise ValueError("Leito não pode ser vazio")
        return s.zfill(2)


class PatientUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=3, max_length=150)
    birth_date: date | None = Field(default=None)
    uti: Literal["UTI 1", "UTI 2"] | None = Field(default=None)
    bed: str | None = Field(default=None, min_length=1, max_length=50)
    health_insurance: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("full_name", mode="before")
    @classmethod
    def sanitize_full_name_update(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return str(v).strip()

    @field_validator("bed", mode="before")
    @classmethod
    def validate_bed_update(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            raise ValueError("Leito não pode ser vazio")
        return s.zfill(2)


class PatientPublic(PatientCreate):
    id: int
    is_admitted: bool
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)


class FluidRecordCreate(BaseModel):
    patient_id: int
    direction: FluidDirection
    category: FluidType
    volume_ml: float | str | None = Field(default=None, description="Volume em ml ou medição qualitativa (+, ++, +++). Obrigatório a menos que 'notes' seja fornecido.")
    occurred_at: datetime
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("volume_ml", mode="before")
    @classmethod
    def validate_volume(cls, v: float | str | int | None) -> float | str | None:
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            return None
        if len(s) > 50:
            raise ValueError("volume_ml excede 50 caracteres")
        try:
            return float(s)
        except ValueError:
            return s

    @model_validator(mode="after")
    def validate_record(self):
        """Validate: (1) volume_ml or notes required; (2) direction must match category."""
        if self.volume_ml is None and not self.notes:
            raise ValueError("Informe o volume (ml) ou uma descrição/nota para o lançamento.")
        inputs = {
            FluidType.ORAL_DIET,
            FluidType.ENTERAL_DIET,
            FluidType.PARENTERAL_NUTRITION,
            FluidType.FILTERED_WATER,
            FluidType.IV_HYDRATION,
            FluidType.MEDICATION,
            FluidType.TRANSFUSION,
            FluidType.OTHER_INPUT,
        }
        if self.category in inputs and self.direction != FluidDirection.INPUT:
            raise ValueError("Categoria de ganho deve ser registrada como entrada")
        if self.category not in inputs and self.direction != FluidDirection.OUTPUT:
            raise ValueError("Categoria de perda deve ser registrada como saída")
        return self


class FluidRecordUpdate(BaseModel):
    volume_ml: float | str | None = Field(default=None)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("volume_ml", mode="before")
    @classmethod
    def validate_update_volume(cls, v: float | str | int | None) -> float | str | None:
        if v is None:
            return None
        s = str(v).strip()
        if not s:
            return None
        try:
            return float(s)
        except ValueError:
            return s


class FluidRecordPublic(BaseModel):
    id: int
    patient_id: int
    registered_by_id: int
    updated_by_id: int | None = None
    direction: FluidDirection
    category: FluidType
    volume_ml: float | str | None = None
    qualitative_value: str | None = None
    occurred_at: datetime
    notes: str | None
    created_at: datetime
    updated_at: datetime | None = None
    registered_by_name: str | None = None
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def resolve_volume_and_qualitative(cls, data: any) -> any:
        if hasattr(data, "volume_ml"):
            vol = getattr(data, "volume_ml", None)
            qual = getattr(data, "qualitative_value", None)
            formatted_vol = vol
            if isinstance(vol, float) and vol.is_integer():
                formatted_vol = int(vol)
            
            author_name = getattr(data.registered_by, "username", None) if hasattr(data, "registered_by") and data.registered_by else None

            if vol is not None:
                return {
                    "id": data.id,
                    "patient_id": data.patient_id,
                    "registered_by_id": data.registered_by_id,
                    "updated_by_id": getattr(data, "updated_by_id", None),
                    "direction": data.direction,
                    "category": data.category,
                    "volume_ml": formatted_vol,
                    "qualitative_value": qual,
                    "occurred_at": data.occurred_at,
                    "notes": data.notes,
                    "created_at": data.created_at,
                    "updated_at": getattr(data, "updated_at", None),
                    "registered_by_name": author_name,
                }
            elif qual:
                return {
                    "id": data.id,
                    "patient_id": data.patient_id,
                    "registered_by_id": data.registered_by_id,
                    "updated_by_id": getattr(data, "updated_by_id", None),
                    "direction": data.direction,
                    "category": data.category,
                    "volume_ml": qual,
                    "qualitative_value": qual,
                    "occurred_at": data.occurred_at,
                    "notes": data.notes,
                    "created_at": data.created_at,
                    "updated_at": getattr(data, "updated_at", None),
                    "registered_by_name": author_name,
                }
        return data


class VitalSignBase(BaseModel):
    pulse: int | None = Field(default=None, ge=20, le=250)
    blood_pressure: str | None = Field(default=None, max_length=20)
    temperature: float | None = Field(default=None, ge=30.0, le=45.0)
    respiration: int | None = Field(default=None, ge=0, le=80)
    spo2: int | None = Field(default=None, ge=0, le=100)
    hgt: int | None = Field(default=None, ge=0, le=999)


class VitalSignCreate(VitalSignBase):
    patient_id: int
    occurred_at: datetime


class VitalSignUpdate(VitalSignBase):
    pass


class VitalSignPublic(VitalSignBase):
    id: int
    patient_id: int
    registered_by_id: int
    updated_by_id: int | None = None
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class DailySpreadsheetData(BaseModel):
    fluids: list[FluidRecordPublic]
    vitals: list[VitalSignPublic]


class DailyBalance(BaseModel):
    patient_id: int
    date: date
    input_ml: int
    output_ml: int
    balance_ml: int
    cumulative_balance: float
    status: str
    qualitative_records: list[FluidRecordPublic] = []
