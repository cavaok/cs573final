from supabase import create_client
import pandas as pd
import altair as alt

# Supabase credentials
url = "https://fxwzblzdvwowourssdih.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3pibHpkdndvd291cnNzZGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NjA1NTUsImV4cCI6MjA1MjAzNjU1NX0.Kcc9aJmOcgn6xF76aqfGUs6rO9awnabimX8HJnPhzrQ"

# Initialize Supabase client
supabase = create_client(url, key)

# Fetch data from your table
response = supabase.table("adversarial_examples").select("*").execute()

# Convert to pandas DataFrame
data = pd.DataFrame(response.data)

# Create an interactive Altair chart
chart = alt.Chart(data).mark_bar().encode(
    x='label_kld',
    y='mse',
    tooltip=['label_kld', 'mse']  # Interactive tooltip
).properties(
    width=600,
    height=400,
    title='My Interactive Visualization'
).interactive()  # Makes the chart interactive

# Save the chart as a self-contained HTML file
chart.save('index.html')