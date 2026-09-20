# Fix the investor deck so PowerPoint can open it

PowerPoint refuses the current file. I inspected the file and found the cause.

## What's wrong

The deck's internal index lists four "slide master" parts, but only one of them
actually exists inside the file. PowerPoint checks this index before opening and
rejects the whole file when an item it lists is missing — which is exactly the
"PowerPoint can't read this file" message. LibreOffice ignores the mismatch,
which is why the earlier preview and the PDF looked fine.

A second, smaller issue: 31 of the coloured boxes and bars in the deck have no
text container inside them. PowerPoint's format rules require one even when the
shape is purely decorative, so these could also trigger a repair prompt.

Both problems came from the automatic repair step that ran after the deck was
generated, not from the slide content itself. The slides, text, colours and
layout are all correct.

## The fix

1. Re-generate the deck from the existing build script (same 4 slides, same
   content and styling — nothing changes visually).
2. Repackage it cleanly:
   - remove the index entries for the three slide masters that don't exist
   - add the required empty text container to every decorative shape
   - drop the stray empty folder entries from the archive
3. Skip the automatic repair step that introduced the problem; validate instead
   against PowerPoint's own stricter rules.
4. Re-render all four slides to images and check each one so the visuals are
   confirmed unchanged.
5. Save the result as a new file, `Adittv-Investor-Pitch-v2.pptx`, in Files, and
   leave the original in place.

## Technical notes

- Source script: `/tmp/deck/build_deck.js` (pptxgenjs).
- Root cause: `[Content_Types].xml` has `Override` entries for
  `/ppt/slideMasters/slideMaster2|3|4.xml`; the package only contains
  `slideMaster1.xml`. Introduced by `validate_document.py --auto-repair`.
- Secondary: `<p:sp>` elements without `<p:txBody>` (6/12/9/4 across slides 1-4)
  violate the PresentationML schema.
- Post-fix check: `validate_document.py` **without** `--auto-repair`, plus a
  script asserting every part referenced in `[Content_Types].xml` and every
  `.rels` target resolves to a real entry in the zip.
- QA: LibreOffice to PDF, `pdftoppm` to JPEG, inspect all four slides.
