"""Tangible translations of a CO2e number (the *understand* verb).

Constants are fixed by docs/API_CONTRACT.md so the frontend and backend agree.
Keep these in sync with the contract.
"""
from __future__ import annotations

from app.models import Equivalence

# 1 kg CO2e equivalences (from API_CONTRACT.md)
KM_PER_KG = 5.56          # km driven in an avg petrol car (~0.18 kg/km)
PHONE_CHARGES_PER_KG = 121.6  # smartphone full charges (~0.00822 kg/charge)
TREES_YEAR_PER_KG = 0.0455    # trees-year (a mature tree absorbs ~22 kg/yr -> 1/22)


def equivalence_for(kg: float) -> Equivalence:
    """Convert a kg CO2e figure into driving / charging / tree equivalents."""
    return Equivalence(
        kmDriven=round(kg * KM_PER_KG, 2),
        phoneCharges=round(kg * PHONE_CHARGES_PER_KG, 1),
        treesYear=round(kg * TREES_YEAR_PER_KG, 3),
    )
