from enum import Enum

class ObservationType(str, Enum):
    BLOOD_PRESSURE = "Blood Pressure"
    BMI = "BMI"
    HEART_RATE = "Heart Rate"
    ALLERGY = "Allergy"
    TEMPERATURE = "Temperature"
    RESPIRATORY_RATE = "Respiratory Rate"
