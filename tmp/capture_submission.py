from pathlib import Path
import time
import subprocess

import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

API = "http://localhost:3000"
APP = "http://localhost:5173"
OUTPUT = Path(r"D:\rpg-project\release-materials\screenshots")
OUTPUT.mkdir(parents=True, exist_ok=True)

stamp = str(int(time.time()))
session = requests.Session()
response = session.post(f"{API}/auth/register", json={
    "email": f"prezentacja.{stamp}@example.com",
    "password": "Prezentacja123",
}, timeout=20)
response.raise_for_status()
access_token = session.cookies.get("access_token")
character_name = f"Demo{stamp[-8:]}"
response = session.post(
    f"{API}/characters",
    json={"name": character_name},
    headers={"Cookie": f"access_token={access_token}"},
    timeout=20,
)
response.raise_for_status()
subprocess.run([
    "docker", "compose", "exec", "-T", "postgres", "psql", "-U", "rpg", "-d", "rpg_db",
    "-c", f"UPDATE characters SET gold = 5000 WHERE name = '{character_name}'",
], cwd=r"D:\rpg-project", check=True, capture_output=True)

options = webdriver.ChromeOptions()
options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--window-size=1440,1000")
options.add_argument("--hide-scrollbars")
driver = webdriver.Chrome(options=options)
wait = WebDriverWait(driver, 25)

try:
    driver.get(APP)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".auth-gateway, .gateway-screen")))
    driver.save_screenshot(str(OUTPUT / "01-logowanie.png"))

    for cookie in session.cookies:
        driver.add_cookie({"name": cookie.name, "value": cookie.value, "path": "/"})
    driver.get(APP)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".game-shell")))
    time.sleep(1.2)
    driver.save_screenshot(str(OUTPUT / "02-twierdza.png"))

    views = [
        ("Zbrojownia", "03-zbrojownia.png"),
        ("Targowisko", "04-targowisko.png"),
        ("Kupiec", "05-kupiec.png"),
        ("Wyprawy", "06-wyprawy.png"),
        ("Arena", "07-arena.png"),
        ("Bractwo", "08-bractwo.png"),
    ]
    for label, filename in views:
        button = wait.until(EC.element_to_be_clickable((By.XPATH, f"//button[.//*[normalize-space()='{label}'] or normalize-space()='{label}']")))
        driver.execute_script("arguments[0].click()", button)
        time.sleep(1.4)
        driver.save_screenshot(str(OUTPUT / filename))

    guild_name = f"Straż {stamp[-5:]}"
    driver.find_element(By.CSS_SELECTOR, ".guild-create-form input").send_keys(guild_name)
    driver.find_element(By.CSS_SELECTOR, ".guild-create-form textarea").send_keys("Wspólnota strażników północnych rubieży Etherii.")
    driver.find_element(By.XPATH, "//button[normalize-space()='Wznieś chorągiew']").click()
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".guild-hall-banner")))
    time.sleep(1.2)
    driver.save_screenshot(str(OUTPUT / "09-sala-bractwa.png"))

    property_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[.//*[normalize-space()='Posiadłość'] or normalize-space()='Posiadłość']")))
    driver.execute_script("arguments[0].click()", property_button)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".property-wilderness")))
    time.sleep(1)
    driver.save_screenshot(str(OUTPUT / "10-posiadlosc-zakup.png"))
    driver.find_element(By.CSS_SELECTOR, ".property-purchase-form input").send_keys("Wilcze Uroczysko")
    driver.find_element(By.CSS_SELECTOR, ".property-purchase-form textarea").send_keys("Ciche schronienie na północnych rubieżach Etherii.")
    driver.find_element(By.XPATH, "//button[contains(normalize-space(),'Obejmij ziemię')]").click()
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".property-estate")))
    time.sleep(1.2)
    driver.save_screenshot(str(OUTPUT / "11-posiadlosc.png"))
finally:
    driver.quit()
