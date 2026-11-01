# Correction — survey data (2026-11-01)

The survey presented on slides 3–5 of the MediMatch conference deck is not validated
participant research. Its Google Form shows 64 responses:

- **52 were generated** by the project's synthetic-survey tool (MediMatch-Data-Generator) and
  submitted to the form. The form's export in that repository holds exactly these 52, all
  timestamped within eight minutes on 24 November 2025.
- **12 arrived later, and their provenance is unverified.** No record on hand shows who submitted
  them, so they cannot be treated as participant responses either.

The percentages on the slides were computed over all 64. The deck, the speaker notes and
the read-aloud script described it as a field study of 64 healthcare professionals with an 80%
response rate, and the script's Q&A called it "real field data". That was wrong.

What stands:
- Facility names and locations are public and real.
- Inventory quantities are synthetic demonstration data, and no patient records are used.
- KEMSA's 57% national order-fill rate (mid-2025) is a published figure.

What changed in this repository:
- `Speaker_Notes.md` and `Presentation_Script.md` carry this correction at the top, and the
  specific claims are replaced or marked.
- `build_deck.py` now labels the survey as synthetic and illustrative, so any rebuilt deck says so.
- `MediMatch_Conference_Deck.pptx` and `.pdf` are left as the record of what was presented. They
  still carry the original wording. Do not reuse them; rebuild from `build_deck.py` first.

Survey figures printed elsewhere (for example in an abstract book) carry the same problem.
Correcting those is a decision for the author.
