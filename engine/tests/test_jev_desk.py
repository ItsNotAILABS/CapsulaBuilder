from thesis_forge.jev_desk import owner_sign, run_cycle
from thesis_forge.receipts import reset_chain


def test_jev_rejects_reckless():
    reset_chain()
    out = run_cycle("yolo 5000 perps", reckless=True)
    assert out["ok"] is True
    assert out["status"] == "REJECT"
    assert out["receipt"]["kind"] == "jev.reject"
    assert out["evaluation"]["accepted"] is False


def test_jev_pass_needs_owner_sign():
    reset_chain()
    out = run_cycle("safe MON/USDC swap")
    assert out["status"] == "NEEDS_OWNER_SIGN"
    signed = owner_sign(out["receipt"]["receipt_hash"])
    assert signed["status"] == "SIGNED"
    assert signed["receipt"]["kind"] == "jev.owner_sign"
