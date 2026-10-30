---
file: uls_direct_import_research_v1.0.md
version: 1.0
author: Samuel Cao
created: 2026-10-30
last_updated: 2026-10-30
description: Research on whether and how Universal Laser Systems control software (UCP, LSM) imports PDF and DXF files directly, with color, scale, and older-software findings and a checklist for the laser PC visit.
ai_update: Update last_updated and version. Rename file to match. Append changelog at bottom.
---

# ULS direct file import: research for the laser PC visit

**Evidence caveat.** In this session the page fetcher could not reach ulsinc.com, cdn.ulsinc.com, beam.unc.edu, sandbox.umd.edu, or the LightBurn forum. Every finding below comes from search-result excerpts, not from reading the full pages. "Verified" means a named source states it in an excerpt. Excerpts were short and a few were garbled, so read the primary documents before relying on exact wording.

## Bottom line

- ULS officially supports direct import of PDF and DXF into UCP (VLS, PLS, ILS) and LSM (ULTRA). Whether our machine has it is still unknown. In older UCP builds it was a separately licensed add-on, so check for that first.
- PDF is the better container than DXF. ULS says PDF import carries raster and vector and keeps colors; DXF import is vectors only.
- ULS does not document how DXF colors are read (ACI, true color, or layer) or what happens to ACI 7. I found nothing on either. Treat both as unknown until tested.
- I found no evidence that UCP can recolor imported objects. It sets power and speed per color, not the color of an object. If that holds, raw CAD DXFs cannot replace the prep step, and Option 0 is unlikely.
- Pre-UCP print-driver setups probably have no import. Nothing I found says they do.

## Findings

### 1. Platforms, versions, and where import lives

- **Verified.** PDF and DXF files can be imported directly into the UCP (VLS, PLS, ILS) and the LSM (ULTRA), bypassing printing. LSM on ULTRA also takes G-code. ([Direct File Import](https://ulsinc.com/discover-uls-innovations/direct-file-import), [User Interfaces](https://ulsinc.com/discover-uls-innovations/laser-system-user-interfaces))
- **Verified.** The 2026 VLS Platform guide lists direct file import in the specs for VLS3.75, 4.75, and 6.75. ([VLS guide](https://ulsinc.com/assets/pdf/VLS_Platform_User_Guide_2026.02.0103.pdf))
- **Verified (third-party mirror, partly garbled).** The PLS4.75 manual calls it a "software accessory." Open the UCP **System** tab and check **Direct Import Package**. It can be activated if purchased or run as a 30-day free evaluation. Then choosing a file opens a dialog to pick a PDF or DXF. ([PLS4.75 manual p. 109](https://www.manualslib.com/manual/1050818/Universal-Laser-Systems-Pls4-75.html?page=109))
- **Reported.** A UNC BeAM SOP describes clicking the folder icon near the top of UCP and then the **Import** box. It is unclear whether that is raw PDF/DXF or a UCP job file exported from another PC. ([UNC SOP](https://beam.unc.edu/files/2019/01/LaserCutter_SoftwareSOP_01012019.pdf))
- **Not found.** The menu path in a current UCP, whether current builds still gate import behind a license, and the first UCP version that has it.

### 2. Color handling

- **Verified.** For both DXF and PDF, ULS says color assignments are preserved and used to assign process type and settings. It does not say whether DXF color means ACI, true color, or layer color. ([Direct File Import](https://ulsinc.com/discover-uls-innovations/direct-file-import))
- **Reported (PLS4.75 excerpt).** On the Materials tab, red DXF vectors import as cut and blue as scribe. On the Manual tab, non-blue vectors become red cut. The excerpt cut off before the other colors. ([manual](https://www.manualslib.com/manual/1050818/Universal-Laser-Systems-Pls4-75.html?page=109))
- **Verified (general DXF).** Group 420 is 24-bit true color and overrides group 62 (ACI) when both exist. ([Autodesk DXF reference](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-DXF/files/GUID-3610039E-27D1-4E23-B6D3-7E60B22BB5BD.htm))
- **Inferred.** A simple importer reads ACI only. Fusion and Onshape raw exports are usually BYLAYER or ACI 7 on layer 0, so everything would arrive as one color. If we write 420, keep it consistent with 62.
- **ACI 7.** **Reported:** CAD programs draw it white on dark backgrounds and black on light ones. ([McNeel](https://discourse.mcneel.com/t/3dm-dxf-rhino-black-turns-into-white/51206)) **Not found:** how UCP treats it. **Inferred:** it could import as white or be skipped.
- **PDF exact RGB.** **Reported:** lab guides say CMYK does not work and colors must be exact RGB ([MIT 2.S97](https://web.mit.edu/ideation/2.S97/laser_cutter/index.html)). A CorelDRAW user fixed unrecognized ULS colors by rebuilding the palette with exact RGB values ([thread](https://community.coreldraw.com/talk/coreldraw_community/f/community-site-general-questions/65413/uls-laser-printer-setting/309730)). **Not found:** whether import converts CMYK. **Inferred:** assume exact RGB is required.
- **Recoloring in UCP.** **Reported:** a VLS wiki says UCP does not allow resizing, rotating, or editing layers or colors. In **Settings > Manual Control** you pick a color, set power and speed, and mark unused colors **Skip**. ([NTUST](https://ttda.ad.ntust.edu.tw/wiki/en/Laser-Cutting/VLS/)) That describes the print-job flow. **Not found:** recoloring after a direct import.

### 3. Raster versus vector

- **Verified.** DXF import is vectors only and ignores raster data. PDF import handles both raster and vector. ([Direct File Import](https://ulsinc.com/discover-uls-innovations/direct-file-import))
- **Inferred.** A filled black shape in a DXF will not become a raster engrave. It is a path, and its process comes from its color. Expect "Black = raster" to fail for DXF and pass, if at all, only for PDF.
- **Not found.** Whether a black PDF fill becomes raster on import. For the print driver, **Reported:** lab guides say a black fill triggers raster engraving ([MIT 2.S97](https://web.mit.edu/ideation/2.S97/laser_cutter/index.html)).
- **Line width.** **Reported:** the 0.001 in rule applies to the print driver ([UMD](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel)). For import, one AutoCAD guide says to uncheck "Plot object lineweights" because it can corrupt output into UCP ([Northeastern](https://makerspaces.northeastern.edu/wp-content/uploads/2023/07/Laser-Cutting-from-AutoCAD.docx)), and a ULS reseller guide saves a red-255,0,0 PDF for direct import ([HLT](https://hltlasers.com/wp-content/uploads/2020/03/ULS-Laser-Systems-Solidworks-Vector-Path-Printing-Setup.pdf)). **Inferred:** width likely matters for PDF and rarely for DXF.

### 4. Units, scale, and placement

- **Verified.** For DXF, the user can specify scale and force the design to the center of the field, to avoid coordinate-system problems. ([Direct File Import](https://ulsinc.com/discover-uls-innovations/direct-file-import))
- **Inferred.** That implies the importer asks or offers options rather than trusting `$INSUNITS`. **Not found:** whether it reads `$INSUNITS` at all.
- **Not found.** How a PDF page maps to the bed. **Inferred:** PDF units are fixed (1/72 in), so scale should be true. The test card's 0.25 in offset from top-left will show the origin.

### 5. Known limitations

- **Verified.** DXF raster content is dropped (see 3). In the print-driver manual, the laser "is NOT a postscript device," so PostScript fills, textures, and fonts will not print; convert fonts to curves. ([ULS X2-600 manual](https://manualzilla.com/doc/7400215/universal-laser-systems-x2-600-specifications?page=11))
- **Not found.** Any ULS statement on SPLINE, ELLIPSE, HATCH, TEXT, INSERT, PDF versions, live fonts in PDFs, or file size limits.
- **Reported (other laser software).** Splines, ellipses, hatches, and text are the usual trouble spots. Workarounds are flattening curves and exploding hatches ([LightBurn thread](https://forum.lightburnsoftware.com/t/dxf-hatches-not-importing/141840), [ezdxf R12 export](https://ezdxf.readthedocs.io/en/stable/addons/r12export.html)). **Inferred:** emit only LINE, ARC, and LWPOLYLINE, and outline all text.

### 6. Older ULS setups

- **Verified.** UCP is a taskbar application that controls the laser over USB; the printer driver intercepts print jobs and hands them to it. Driver names match the model, such as "VLS6.60" or "ILS12.150D." ([UNC SOP](https://beam.unc.edu/files/2019/01/LaserCutter_SoftwareSOP_01012019.pdf))
- **Verified.** ULS driver guides for the M/V/X series install through Windows Add Printer and say to select the model the laser displays at boot. ([MVX driver guide](https://cdn.ulsinc.com/assets/other/56c689c5d647910d1c8b4570/printer_driver_installation_xl.pdf))
- **Inferred.** If printing opens only a Windows Properties dialog and there is no tray icon or UCP window, it is pre-UCP.
- **Not found.** Any import feature for pre-UCP software, or whether a V-460 can run a current UCP. **Inferred:** no import, since every import source I found describes UCP or LSM.

## What to look for at the laser PC

UI cues:

- A taskbar tray icon or a window titled "Universal Control Panel." An LSM window means ULTRA.
- UCP tabs: **System**, **Materials**, **Manual**. In System, a **Direct Import Package** checkbox. A folder icon or **Import** button near the top.
- Windows **Printers** list: the printer name (for example VLS6.60) should match the model on the laser's display at boot.
- **Settings > Manual Control** color table: which colors exist, and which are set to Skip.

Checklist:

1. Record model, printer name, UCP version (About or Apps list), and whether the Direct Import Package box exists and is on.
2. Screenshot every import dialog. Note scale, center, and unit options.
3. Import the raw mm DXF. Did it ask for units? Is it 101.6 in or 4 in?
4. Try to recolor an imported object (click, right-click, any color control). Record yes or no.
5. Import a DXF with one line each in ACI 1, 5, and 7, plus one line with group 420 only. Record the resulting color for each.
6. Import the PDF at 0.001 in, then 0.003 in. Record which lines cut.
7. Print preview only first. Cut only what looks right.

## Implications for the PRD

- **Step 0.** Add the Direct Import Package check and the dialog screenshots. Add the ACI 1/5/7 and 420-only DXF test and the recolor test. Do not fail DXF on "Black = raster" (Inferred it cannot pass); test raster through the PDF.
- **Option 0.** Weak for raw CAD DXFs. With no recoloring and one color per file, it saves nothing. It survives only if UCP can recolor on import.
- **Option E1.** Prefer PDF as the saved file, because ULS documents color-driven process assignment there. Offer DXF as a vectors-only second format with flattened entities, outlined text, and consistent 62 and 420.
- **Issue 2.** Reframe as "which UCP version, and is the import package enabled." ULS support is documented; availability on our machine is not.
- **Issue 14.** Read the Manual Control color table and screenshot it. NTUST shows per-color power, speed, and Skip.
- **Issue 16.** Confirmed as a risk, though ULS is silent. Raw DXF probably arrives as one color.
- **Issue 17.** ACI 7 is background-dependent in CAD tools and undocumented in UCP. Test it; if it fails, write the engrave color with group 420.

## Sources

- [ULS: Direct File Import](https://ulsinc.com/discover-uls-innovations/direct-file-import)
- [ULS: Laser System User Interfaces](https://ulsinc.com/discover-uls-innovations/laser-system-user-interfaces)
- [ULS: VLS Platform User Guide 2026.02.0103](https://ulsinc.com/assets/pdf/VLS_Platform_User_Guide_2026.02.0103.pdf)
- [PLS4.75 manual, Direct Import (ManualsLib)](https://www.manualslib.com/manual/1050818/Universal-Laser-Systems-Pls4-75.html?page=109)
- [UNC BeAM laser cutter software SOP](https://beam.unc.edu/files/2019/01/LaserCutter_SoftwareSOP_01012019.pdf)
- [NTUST VLS laser cutting wiki](https://ttda.ad.ntust.edu.tw/wiki/en/Laser-Cutting/VLS/)
- [UMD: Using the ULS Laser Control Panel](https://sandbox.umd.edu/wiki/index.php/Using_the_ULS_Laser_Control_Panel)
- [MIT 2.S97 laser cutter tutorial](https://web.mit.edu/ideation/2.S97/laser_cutter/index.html)
- [ULS X2-600 manual (ManualZilla)](https://manualzilla.com/doc/7400215/universal-laser-systems-x2-600-specifications?page=11)
- [ULS MVX printer driver installation](https://cdn.ulsinc.com/assets/other/56c689c5d647910d1c8b4570/printer_driver_installation_xl.pdf)
- [Autodesk DXF common group codes](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-DXF/files/GUID-3610039E-27D1-4E23-B6D3-7E60B22BB5BD.htm)
- [McNeel forum: DXF black turns into white](https://discourse.mcneel.com/t/3dm-dxf-rhino-black-turns-into-white/51206)
- [CorelDRAW community: ULS laser printer setting](https://community.coreldraw.com/talk/coreldraw_community/f/community-site-general-questions/65413/uls-laser-printer-setting/309730)
- [HLT Lasers: SolidWorks vector path setup for ULS](https://hltlasers.com/wp-content/uploads/2020/03/ULS-Laser-Systems-Solidworks-Vector-Path-Printing-Setup.pdf)
- [Northeastern: Laser cutting from AutoCAD](https://makerspaces.northeastern.edu/wp-content/uploads/2023/07/Laser-Cutting-from-AutoCAD.docx)
- [LightBurn forum: DXF hatches not importing](https://forum.lightburnsoftware.com/t/dxf-hatches-not-importing/141840)
- [ezdxf: R12 export](https://ezdxf.readthedocs.io/en/stable/addons/r12export.html)
- [LightBurn forum: Universal Laser Systems support](https://forum.lightburnsoftware.com/t/universal-laser-systems-support/112229) (listed in the brief; only seen through a search excerpt)

## CHANGELOG

- v1.0 (2026-10-30): Initial release.
