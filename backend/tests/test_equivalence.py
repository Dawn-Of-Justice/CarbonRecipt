"""Equivalence translator: the *understand* verb. Numbers must match the contract."""

from app.carbon.equivalence import (
    KM_PER_KG,
    PHONE_CHARGES_PER_KG,
    TREES_YEAR_PER_KG,
    equivalence_for,
)


def test_zero_is_zero():
    eq = equivalence_for(0.0)
    assert eq.kmDriven == 0.0
    assert eq.phoneCharges == 0.0
    assert eq.treesYear == 0.0


def test_uses_contract_constants():
    eq = equivalence_for(10.0)
    assert eq.kmDriven == round(10.0 * KM_PER_KG, 2)
    assert eq.phoneCharges == round(10.0 * PHONE_CHARGES_PER_KG, 1)
    assert eq.treesYear == round(10.0 * TREES_YEAR_PER_KG, 3)


def test_scales_linearly():
    one = equivalence_for(1.0)
    ten = equivalence_for(10.0)
    assert ten.kmDriven == round(one.kmDriven * 10, 2)


def test_rounding_precision():
    eq = equivalence_for(1.23456)
    # km rounded to 2dp, charges to 1dp, trees to 3dp
    assert eq.kmDriven == round(1.23456 * KM_PER_KG, 2)
    assert eq.phoneCharges == round(1.23456 * PHONE_CHARGES_PER_KG, 1)
    assert eq.treesYear == round(1.23456 * TREES_YEAR_PER_KG, 3)
