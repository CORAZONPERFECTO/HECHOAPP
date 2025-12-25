import os
import jinja2
from weasyprint import HTML, CSS
from datetime import datetime

# Setup Jinja Environment
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')
env = jinja2.Environment(loader=jinja2.FileSystemLoader(TEMPLATE_DIR))

def render_html(report_data: dict, ticket_data: dict, org_data: dict) -> str:
    template = env.get_template('report_v1.html')
    
    # Pre-process data if needed
    formatted_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    # Render
    html_out = template.render(
        report=report_data,
        ticket=ticket_data,
        org=org_data,
        generatedDate=formatted_date
    )
    return html_out

def generate_pdf_bytes(report_data: dict, ticket_data: dict, org_data: dict) -> bytes:
    """
    Generates a PDF file in memory from the report data.
    """
    html_string = render_html(report_data, ticket_data, org_data)
    
    # Create PDF
    # We can add custom CSS objects here if needed for dynamic styling
    pdf_bytes = HTML(string=html_string).write_pdf()
    
    return pdf_bytes
