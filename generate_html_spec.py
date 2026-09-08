import markdown

with open('FINAL_TECHNICAL_SPECIFICATION.md', 'r', encoding='utf-8') as f:
    md_text = f.read()

html_body = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])

full_html = f"""<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Ітогове Технічне Завдання — QA Manual 19.09.2024</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; max-width: 950px; margin: 40px auto; padding: 0 24px; color: #1f2937; line-height: 1.6; background-color: #f9fafb; }}
        .doc-container {{ background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }}
        h1 {{ font-size: 2.1em; border-bottom: 3px solid #0055ff; padding-bottom: 10px; color: #111827; margin-top: 0; }}
        h2 {{ font-size: 1.45em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; color: #1e293b; margin-top: 28px; }}
        h3 {{ font-size: 1.15em; color: #334155; margin-top: 20px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; }}
        th, td {{ border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }}
        th {{ background: #f1f5f9; font-weight: 600; color: #0f172a; }}
        tr:nth-child(even) {{ background: #f8fafc; }}
        code {{ background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }}
        pre {{ background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; font-family: monospace; }}
        pre code {{ background: none; color: inherit; padding: 0; }}
    </style>
</head>
<body><div class="doc-container">{html_body}</div></body>
</html>"""

with open('FINAL_TECHNICAL_SPECIFICATION.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print('Generated HTML spec export successfully!')
