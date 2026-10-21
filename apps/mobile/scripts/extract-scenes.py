import argparse
from pathlib import Path

from PIL import Image, ImageDraw


MOBILE = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = MOBILE.parents[1] / "workspace" / "ChatGPT Image 17 سبتمبر 2026، 02_59_36 ص.png"
OUTPUT = MOBILE / "src" / "assets" / "scenes"
ROWS = (
    (0, 244, (
        (0, 221, "customer_onboarding_home"),
        (225, 452, "customer_onboarding_diagnosis"),
        (456, 682, "customer_onboarding_technician"),
        (687, 965, "customer_home_hero"),
        (969, 1136, "appliance_washing_machine"),
        (1140, 1313, "appliance_refrigerator"),
        (1318, 1536, "appliance_air_conditioner"),
    )),
    (282, 460, (
        (0, 146, "fault_washing_machine"),
        (150, 295, "fault_refrigerator"),
        (299, 458, "fault_air_conditioner"),
        (464, 643, "fault_diagnosis_visual"),
        (649, 826, "fault_success"),
        (831, 1044, "fault_empty"),
        (1049, 1210, "technician_discovery_hero"),
        (1216, 1377, "technician_placeholder_male"),
        (1382, 1536, "technician_placeholder_female"),
    )),
    (495, 619, (
        (0, 168, "technician_trust"),
        (174, 354, "technician_availability"),
        (360, 539, "technician_profile_hero"),
        (545, 683, "technician_profile_services"),
        (689, 849, "technician_profile_location"),
        (855, 999, "technician_profile_reviews"),
        (1005, 1216, "service_request_service"),
        (1220, 1373, "service_request_confirmation"),
        (1378, 1536, "service_request_success"),
    )),
    (649, 793, (
        (0, 256, "tracking_on_the_way"),
        (262, 472, "tracking_in_progress"),
        (478, 691, "tracking_completed"),
        (697, 893, "tracking_success"),
        (898, 1186, "subscription_hero"),
        (1190, 1536, "subscription_premium"),
    )),
    (827, 980, (
        (0, 190, "technician_dashboard_hero"),
        (196, 383, "technician_dashboard_performance"),
        (389, 545, "technician_requests"),
        (551, 686, "merchant_dashboard_hero"),
        (690, 906, "merchant_products"),
        (912, 1071, "merchant_sales"),
        (1077, 1218, "merchant_success"),
    )),
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--contact-sheet", type=Path)
    args = parser.parse_args()
    with Image.open(args.source) as source:
        if source.size != (1536, 1024):
            raise ValueError(f"Expected 1536x1024 master sheet, got {source.size}")
        source = source.convert("RGB")
        OUTPUT.mkdir(parents=True, exist_ok=True)
        names = [name for _, _, panels in ROWS for _, _, name in panels]
        if len(names) != 38 or len(set(names)) != 38:
            raise ValueError("Expected 38 unique scene names")
        previews = []
        total = 0
        for top, bottom, panels in ROWS:
            for left, right, name in panels:
                box = (left + 2, top + 2, right - 2, bottom - 2)
                crop = source.crop(box)
                destination = OUTPUT / f"{name}.webp"
                crop.save(destination, "WEBP", quality=90, method=6, exact=True)
                with Image.open(destination) as encoded:
                    encoded.load()
                    if encoded.size != crop.size or encoded.format != "WEBP":
                        raise ValueError(f"Invalid output: {destination}")
                    previews.append((name, encoded.convert("RGB")))
                size = destination.stat().st_size
                total += size
                print(f"{name}\t{crop.width}x{crop.height}\t{size} bytes\t{box}")
        print(f"TOTAL\t{len(previews)} scenes\t{total} bytes")
        if args.contact_sheet:
            if not args.contact_sheet.parent.is_dir():
                raise ValueError("Contact sheet parent directory must exist")
            columns, cell_width, cell_height = 4, 360, 280
            sheet = Image.new("RGB", (columns * cell_width, ((len(previews) + columns - 1) // columns) * cell_height), "#dddddd")
            draw = ImageDraw.Draw(sheet)
            for index, (name, preview) in enumerate(previews):
                x = (index % columns) * cell_width
                y = (index // columns) * cell_height
                sheet.paste(preview, (x + (cell_width - preview.width) // 2, y + (248 - preview.height) // 2))
                draw.text((x + 8, y + 250), name, fill="black")
                draw.text((x + 8, y + 264), f"{preview.width} x {preview.height}", fill="black")
            sheet.save(args.contact_sheet)
            print(f"CONTACT_SHEET\t{args.contact_sheet}")


if __name__ == "__main__":
    main()
