from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import FluidDirection, FluidType, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    full_name: str = Field(min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: UserRole = UserRole.CLINICAL


class PatientCreate(BaseModel):
    medical_record: str = Field(min_length=1, max_length=60)
    full_name: str = Field(min_length=3, max_length=150)
    birth_date: date
    bed: str = Field(min_length=1, max_length=30)
    health_insurance: str = Field(default="SUS", min_length=1, max_length=100)


class PatientPublic(PatientCreate):
    id: int
    is_admitted: bool
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)


class FluidRecordCreate(BaseModel):
    patient_id: int
    direction: FluidDirection
    category: FluidType
    volume_ml: float | str = Field(description="Volume em ml ou medição qualitativa (+, ++, +++)")
    occurred_at: datetime
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("volume_ml", mode="before")
    @classmethod
    def validate_volume(cls, v: float | str | int | None) -> float | str:
        if v is None:
            raise ValueError("volume_ml não pode ser nulo")
        s = str(v).strip()
        if not s:
            raise ValueError("volume_ml não pode ser vazio")
        if len(s) > 50:
            raise ValueError("volume_ml excede 50 caracteres")
        try:
            return float(s)
        except ValueError:
            return s

    @model_validator(mode="after")
    def validate_category_direction(self):
        inputs = {
            FluidType.ORAL_DIET,
            FluidType.ENTERAL_DIET,
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
    direction: FluidDirection
    category: FluidType
    volume_ml: float | str | None = None
    qualitative_value: str | None = None
    occurred_at: datetime
    notes: str | None
    created_at: datetime
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
            
            if vol is not None:
                return {
                    "id": data.id,
                    "patient_id": data.patient_id,
                    "registered_by_id": data.registered_by_id,
                    "direction": data.direction,
                    "category": data.category,
                    "volume_ml": formatted_vol,
                    "qualitative_value": qual,
                    "occurred_at": data.occurred_at,
                    "notes": data.notes,
                    "created_at": data.created_at,
                }
            elif qual:
                return {
                    "id": data.id,
                    "patient_id": data.patient_id,
                    "registered_by_id": data.registered_by_id,
                    "direction": data.direction,
                    "category": data.category,
                    "volume_ml": qual,
                    "qualitative_value": qual,
                    "occurred_at": data.occurred_at,
                    "notes": data.notes,
                    "created_at": data.created_at,
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
    occurred_at: datetime
    created_at: datetime
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
