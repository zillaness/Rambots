---
file: print_path_research_v1.0.md
version: 1.0
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Research on how Chrome, Edge, Adobe Reader, and other PDF viewers send vector lines to a Windows laser print driver, with a fallback checklist and PRD implications.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# Print path research: browser and PDF printing to a laser driver

Labels: **Verified** (a cited source states it), **Reported** (forum or user report), **Inferred** (my reasoning). See the limits note under Sources.

## Bottom line

- **Verified:** For a web page, Chrome and Edge on Windows build a PDF, then convert it to EMF with PDFium, then hand the EMF to the driver. The headless print-to-PDF check covered only the first step.
- **Verified:** PDFium's GDI pen code never draws a stroke thinner than 1 device unit. **Inferred:** whether that stays within ULS's 0.001 in rule depends on the resolution the driver reports (1 unit is 0.001 in at 1000 dpi, 0.0017 in at 600 dpi). I could not find what the ULS driver reports.
- **Reported:** Saving a PDF and printing it from Adobe Reader or Acrobat is the common working route for Epilog and ULS drivers. No report states a stroke width, so 0.072 pt is untested. No ULS, Epilog, or Trotec page gives Acrobat-specific steps (not found).
- **Not found:** any report of printing from Chrome or Edge to a ULS, Epilog, or Trotec driver, good or bad. Chrome stays the riskiest route.
- **Verified:** SumatraPDF prints pages as images, so it cannot keep vector cuts. Foxit has no evidence either way.

## Chrome and Edge on Windows

1. **Pipeline. Verified:** the renderer produces a PDF, and a sandboxed utility process converts it to EMF with PDFium, page by page ([code review](https://codereview.chromium.org/255543006/), [converter source](https://chromium.googlesource.com/chromium/src/+/891de733b481fff05ae0d07658b8e3bd4b622a6e/chrome/services/printing/pdf_to_emf_converter.cc)). **Inferred:** Edge is the same, since it exposes the same policies. I found no source on differences.
2. **Modes. Verified:** the render modes are normal, text only, PostScript level 2 and 3, EMF with reduced rasterization, and PostScript 3 with Type 42 fonts ([source](https://chromium.googlesource.com/chromium/src/+/196a48bb90a8dd70b666178087d2d105ffd61cff/printing/pdf_render_settings.h)). **Inferred:** a GDI driver gets plain EMF, so `PrintPostScriptMode` (Type 42 fonts for PostScript printers, per [Edge docs](https://learn.microsoft.com/sv-se/deployedge/microsoft-edge-browser-policies/printpostscriptmode)) should not matter. **Verified:** XPS printing was off by default in the Chromium snapshot I found ([snapshot](https://chromium.googlesource.com/chromium/src/+/83.0.4103.116/printing/printing_features.cc)); today's default is unconfirmed.
3. **Do vectors stay vectors? Verified:** `PrintRasterizationMode` applies to non-PostScript printers on Windows. Full (the default) rasterizes whole pages "if needed"; Fast reduces rasterization ([Edge](https://learn.microsoft.com/et-ee/DeployEdge/microsoft-edge-browser-policies/printrasterizationmode), [Samsung mirror, Chrome 84+](https://developer.samsung.com/browser/policy/print-rasterization-mode.html)). **Verified:** PDFium draws transparent content into a bitmap first ([commit](https://pdfium.googlesource.com/pdfium/+/17b5cf451cfcd5ec614d1d4e1afd8daa8b5d8699%5E)). **Not found:** a definition of "needed". **Inferred:** opaque strokes and fills are not rasterized, so keep every object fully opaque.
4. **Minimum line width. Verified:** `CreateExtPen` scales the width, clamps it to at least 1.0, and rounds up before `ExtCreatePen` ([source](https://pdfium.googlesource.com/pdfium/+/main/core/fxge/win32/cgdi_device_driver.cpp)). **Inferred:** a unit is one printer pixel at the driver's resolution, so 0.0005 in likely prints the same as 0.001 in, and 0.003 in prints thicker. **Reported:** an Inkscape Windows print extension was written to emit vectors only when width was 1 printer pixel or less ([bug 630639](https://bugs.launchpad.net/bugs/630639)); Epilog says "thin" depends on resolution ([Epilog](https://epiloglaser.com/assets/img/knowledge-base/tl-line-weights.htm)). Both hint that drivers treat 1-pixel pens as vectors. Whether ULS does is unknown.
5. **Color. Not found:** any source on ICC or sRGB conversion in Chrome's Windows print path. **Inferred:** PDFium passes plain RGB to GDI, so a shift would come from the driver or Windows color settings. Chrome's Black and white choice could also strip red (Inferred).
6. **Policies. Verified:** the "Print as image" checkbox appears only for PDFs opened in the viewer, and only when `PrintPdfAsImageAvailability` is enabled ([Samsung](https://developer.samsung.com/browser/policy/print-pdf-as-image-availability.html)). It does not apply to web pages. **Reported:** a Chrome and Edge 107 to 108 change broke PostScript form printing until "Print as image" was used ([thread](https://techcommunity.microsoft.com/t5/enterprise/edge-print-pdf-as-image/m-p/3723083)), so the path shifts between versions.
7. **Paper size. Inferred:** Chrome offers only paper sizes the driver lists. **Reported:** Rhino snapped a custom size to a standard one in the Epilog dialog ([McNeel](https://discourse.mcneel.com/t/printing-to-epilog-laser-custom-size-not-holding/223136)). Chrome's route to driver properties is Ctrl+P, More settings, Print using system dialog; the Ctrl+Shift+P shortcut is reported unreliable ([guide](https://windowsreport.com/chrome-system-print-dialog/)).
8. **Field reports. Reported:** Whitman's Epilog guide says "Print to" rasterizes and a saved PDF should be used ([guide](https://maker.whitman.edu/laser-cuttingengraving/info-tips-troubleshooting)). Nothing browser-specific turned up.

## Adobe Reader and Acrobat

- **Page sizing. Verified:** Fit scales to the printable area; Actual size does not scale and crops what does not fit; "Choose paper source by PDF page size" picks the tray from the PDF size ([Adobe](https://helpx.adobe.com/acrobat/desktop/print-documents/set-up-and-print-pdfs/page-size.html)). **Inferred:** use Actual size, leave the tray box alone (a laser driver has one tray), and keep "Print in grayscale" off because it would turn red to gray. I found no source on grayscale.
- **Orientation. Reported:** Epilog drivers tend to flip portrait and landscape (McNeel link above); a lab guide says choose landscape when the page differs from the bed ([FabLab EDP](https://hackmd.io/@fablabedp/laser)). **Inferred:** set orientation by hand, not Auto.
- **Shared PC trap. Reported:** Reader reuses the last scaling choice ([Adobe community](https://community.adobe.com/t5/acrobat-reader-discussions/how-to-set-default-scaling-to-quot-actual-size-quot-in-print-dialog/td-p/11235429)). **Verified:** print presets stored in a PDF work in Acrobat, not Reader ([Adobe](https://helpx.adobe.com/acrobat/kb/scale-or-resize-printed-pages.html)). A student can inherit Fit from the last user.
- **Print as image. Reported:** it rasterizes the page ([MSU](https://fissupport.ipf.msu.edu/kb/a225/autocad-drawing-exported-to-pdf-shows-missing-or-faint-text-and-linework-when-printed.aspx)); Advanced options are grayed out in some Reader installs ([thread](https://community.adobe.com/t5/acrobat-discussions/advanced-print-setup-not-available/m-p/15269906)). Keep it off.
- **Hairlines. Not found:** no source says what Reader sends a GDI driver for a 0.072 pt or zero-width stroke. **Reported:** Acrobat thickens very thin lines on some printers, and passes `0 w` to PostScript as `0 setlinewidth` ([thread](https://community.adobe.com/t5/acrobat-discussions/very-thin-lines-do-not-print-correctly/m-p/14328911/highlight/true)). "Enhance thin lines" is a display preference that some users say affects print; turn it off.
- **Working cases. Reported:** Epilog users "save a copy as PDF and print from Adobe Reader, works very well" ([Inkscape forum](https://inkscape.org/forums/cutplot/vector-output-for-laser-cutterengravers)). A ULS user got red vector cuts from Acrobat but not from Inkscape's own print ([LightBurn forum](https://forum.lightburnsoftware.com/t/prob-printing-to-a-uls-print-driver/50344)). Reader cut correctly where Inkscape's print rasterized ([bug 630639](https://bugs.launchpad.net/bugs/630639)).
- **Transparency. Reported:** Epilog users say any stroke transparency makes the driver raster it ([LightBurn forum](https://forum.lightburnsoftware.com/t/epilog-hairline-vector-cut/60635); I could not tie the claim to one thread).
- **Vendors.** ULS says its driver works with any Windows program ([UMD wiki](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel), Acrobat named). Epilog recommends 0.001 or 0.003 in. An Epilog article shows its Dashboard missing Corel outlines when "Scale with object" was on ([KA-01071](https://support.epiloglaser.com/article/ka-01071)), so drivers react to how a program describes the pen (Inferred). **Reported:** a Trotec vector cut failed from Adobe at 250 dpi but not 125 dpi ([Sawmill Creek](https://sawmillcreek.org/goto/post?id=2539589)).

## Other PDF printers

- **SumatraPDF. Verified:** it renders each page to an image and sends the image ([docs](https://www.sumatrapdfreader.org/docs/Printing)); 3.1 made image printing permanent and removed "Print as Image" ([changelog](https://rd.vector.co.jp/soft/dl/winnt/writing/se493197.html)). Do not use it.
- **Foxit. Not found:** no laser-driver report. **Reported:** some users say it prints thin lines better than Acrobat on paper; a 2013 page says it lacks Print as Image ([Cornell](https://wiki.lepp.cornell.edu/Computing/PDFPrinting)). Unknown whether it keeps vectors.
- **PDF-XChange. Not found:** any laser-driver report.
- **Position:** Reader is the only viewer with positive reports. Chrome's and Edge's PDF viewers share the PDFium path above (Inferred).

## What to try at the laser PC if a print test fails

Cheapest first. Record the driver resolution on every run.

1. Set the driver resolution to its highest value (1000 if offered), then reprint. (Inferred, from the 1-pixel minimum.)
2. Reader: Actual size, grayscale off, Print as image off, orientation set by hand, paper size set to the bed.
3. Reader: Edit, Preferences, Page Display, turn off Enhance thin lines.
4. In the ULS driver, confirm the job is not raster-only and the color table is on. (Inferred from Epilog reports.)
5. Check the saved PDF for transparency or a color profile.
6. Reprint with 0.0005 in, 0.003 in, and a zero-width line (not on the card yet).
7. Chrome or Edge: system dialog, driver paper size equal to the bed, Margins None, Scale 100, Color not Black and white. Try both browsers.
8. Saved PDF in the Chrome or Edge viewer with "Print as image" unchecked.
9. With admin rights, set `PrintRasterizationMode` to 1 (Fast). Diagnostic only; the PRD forbids admin installs.
10. If all fail: UCP import (Option E1) or a native program (Option C).

## Implications for the PRD

- **Step 1:** Run Reader first. Add a row for the saved PDF printed from Chrome or Edge's viewer. Record driver resolution per run. Add a zero-width line to the card. Run the Chrome page print last.
- **Option A:** Rank it below E2. The headless check covered only the PDF stage; the next stage clamps lines to one device unit, and no field report exists. Option B (Electron) shares that stage.
- **Option E2:** Best print route. The app's output (RGB only, opaque, 0.072 pt, bed-size page) matches the working cases, but those never named a width. Add an on-screen checklist for the Reader trap.
- **Issue 1:** Reword to: Chromium source documents PDF to EMF; ULS is silent; no field reports.
- **Issue 3:** No source on browser scaling or margins. Paper sizes are driver-limited (Inferred). Option E avoids Chrome's dialog but not Reader's.
- **Issue 4:** The mechanism is real: a 1-device-unit minimum. The width picker below one pixel will not help on the Chrome path (Inferred).
- **Issue 5:** No evidence of color management here. Lower the risk; the live risks are the grayscale and Black and white toggles.
- **Issue 18:** Add remembered scaling, Print as image, Enhance thin lines, and orientation to the checklist.

## Sources

**Limits.** Page fetching failed for six hosts (sumatrapdfreader.org, learn.microsoft.com, chromium.googlesource.com, chromeenterprise.google, pdfium.googlesource.com, forum.lightburnsoftware.com); they need to be allowed in the session network settings. Every finding comes from search-result excerpts, not full pages, and "Verified" means an excerpt showed the source saying it. Chromium links are snapshots, not current main. Re-open the PDFium pen code and the `PrintRasterizationMode` page before building on them.

- [Chromium code review 255543006](https://codereview.chromium.org/255543006/)
- [pdf_to_emf_converter.cc](https://chromium.googlesource.com/chromium/src/+/891de733b481fff05ae0d07658b8e3bd4b622a6e/chrome/services/printing/pdf_to_emf_converter.cc)
- [pdf_render_settings.h](https://chromium.googlesource.com/chromium/src/+/196a48bb90a8dd70b666178087d2d105ffd61cff/printing/pdf_render_settings.h)
- [printing_features.cc, 83.0.4103.116](https://chromium.googlesource.com/chromium/src/+/83.0.4103.116/printing/printing_features.cc)
- [PDFium cgdi_device_driver.cpp](https://pdfium.googlesource.com/pdfium/+/main/core/fxge/win32/cgdi_device_driver.cpp)
- [PDFium transparency commit](https://pdfium.googlesource.com/pdfium/+/17b5cf451cfcd5ec614d1d4e1afd8daa8b5d8699%5E)
- [Edge PrintRasterizationMode](https://learn.microsoft.com/et-ee/DeployEdge/microsoft-edge-browser-policies/printrasterizationmode)
- [Edge PrintPostScriptMode](https://learn.microsoft.com/sv-se/deployedge/microsoft-edge-browser-policies/printpostscriptmode)
- [Samsung PrintRasterizationMode](https://developer.samsung.com/browser/policy/print-rasterization-mode.html)
- [Samsung PrintPdfAsImageAvailability](https://developer.samsung.com/browser/policy/print-pdf-as-image-availability.html)
- [Microsoft Tech Community: Edge print PDF as image](https://techcommunity.microsoft.com/t5/enterprise/edge-print-pdf-as-image/m-p/3723083)
- [Windows Report: Chrome system print dialog](https://windowsreport.com/chrome-system-print-dialog/)
- [Adobe: page sizing](https://helpx.adobe.com/acrobat/desktop/print-documents/set-up-and-print-pdfs/page-size.html)
- [Adobe: scale printed pages](https://helpx.adobe.com/acrobat/kb/scale-or-resize-printed-pages.html)
- [Adobe community: default scaling](https://community.adobe.com/t5/acrobat-reader-discussions/how-to-set-default-scaling-to-quot-actual-size-quot-in-print-dialog/td-p/11235429)
- [Adobe community: very thin lines](https://community.adobe.com/t5/acrobat-discussions/very-thin-lines-do-not-print-correctly/m-p/14328911/highlight/true)
- [MSU: faint linework when printed](https://fissupport.ipf.msu.edu/kb/a225/autocad-drawing-exported-to-pdf-shows-missing-or-faint-text-and-linework-when-printed.aspx)
- [Epilog: line weights](https://epiloglaser.com/assets/img/knowledge-base/tl-line-weights.htm)
- [Epilog KA-01071](https://support.epiloglaser.com/article/ka-01071)
- [UMD: ULS Laser Control Panel](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel)
- [LightBurn forum: ULS print driver](https://forum.lightburnsoftware.com/t/prob-printing-to-a-uls-print-driver/50344)
- [LightBurn forum: Epilog hairline](https://forum.lightburnsoftware.com/t/epilog-hairline-vector-cut/60635)
- [Inkscape forum: vector output](https://inkscape.org/forums/cutplot/vector-output-for-laser-cutterengravers)
- [Inkscape bug 630639](https://bugs.launchpad.net/bugs/630639)
- [Whitman Epilog guide](https://maker.whitman.edu/laser-cuttingengraving/info-tips-troubleshooting)
- [FabLab EDP Epilog guide](https://hackmd.io/@fablabedp/laser)
- [McNeel: Epilog custom size](https://discourse.mcneel.com/t/printing-to-epilog-laser-custom-size-not-holding/223136)
- [Sawmill Creek: Speedy 300 vector cuts](https://sawmillcreek.org/goto/post?id=2539589)
- [SumatraPDF printing docs](https://www.sumatrapdfreader.org/docs/Printing)
- [SumatraPDF 3.1 changelog (mirror)](https://rd.vector.co.jp/soft/dl/winnt/writing/se493197.html)
- [Cornell PDF printing wiki](https://wiki.lepp.cornell.edu/Computing/PDFPrinting)

## CHANGELOG

- v1.0 (2026-10-30): Initial release.
