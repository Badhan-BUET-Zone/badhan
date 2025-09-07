"""
-- DESCRIPTION --
This script automates the process of creating new blood donors on the Badhan BUET Zone website.
It performs the following actions:
1.  Logs into the website using predefined credentials.
2.  Reads donor information from a specified CSV file.
3.  For each donor in the CSV, it navigates to the donor creation form.
4.  It checks if a donor with the same phone number already exists. If so, it skips that donor.
5.  It fills out the form with the donor's details (name, blood group, hall, etc.).
6.  It submits the form to create the new donor.
7.  It performs a hard reload of the page to ensure a clean state for the next entry.
8.  The script includes robust error handling, saves a screenshot if an error occurs on a row,
    and attempts to recover and continue with the next donor.

-- REQUIRED INSTRUCTIONS BEFORE RUNNING --

----------------------------------------------------------------------------------------------------
STEP 1: PREREQUISITES - What you need installed
----------------------------------------------------------------------------------------------------
1.  Python 3 must be installed on your system.
2.  Required Python Libraries: You must install 'pandas' and 'selenium'.
3.  Google Chrome Browser: This script is designed to work with Google Chrome.
4.  ChromeDriver
----------------------------------------------------------------------------------------------------
STEP 2: SETUP - Placing files correctly
----------------------------------------------------------------------------------------------------
1.  Prepare your data file. It must be a CSV file (e.g., 'badhan_Titumir.csv') and must
    be in the SAME directory as this script. The CSV file MUST have the following columns:
    -   name
    -   phone
    -   studentId
    -   Blood Group
    -   roomNumber
    -   address
    -   Hall
    -   Donation Count (Optional, will default to 0 if not present)
    -   Platelet Donation Count (Optional, will default to 0 if not present)
----------------------------------------------------------------------------------------------------
STEP 3: CONFIGURATION - Edit the variables in this script
----------------------------------------------------------------------------------------------------
You MUST update the variables in the '# --- Configuration ---' section of this script
before running it.
    -   userid:       Your login phone number for the Badhan website.
    -   password:     Your login password for the Badhan website.
    -   CSV_PATH:     The exact filename of your CSV data file.
    -   executable_path: The full path to your 'chromedriver.exe'
----------------------------------------------------------------------------------------------------
STEP 4: HOW TO RUN THE SCRIPT
----------------------------------------------------------------------------------------------------
1.  Open a terminal or command prompt.
2.  Navigate to the directory where you saved this script and your CSV file.
    (Example: cd C:\Users\YourUser\Desktop\badhan_script)
3.  Run the script using the following command:
    python your_script_name.py

-- IMPORTANT NOTES --
-   If the script encounters an error on a specific donor, it will save a screenshot named
    'error_row_[index].png' in the script's directory for debugging.

"""
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time

# --- Configuration ---
url = 'https://badhan-buet-test-46eca.web.app/'
userid = '#' #Input your user id here
password = '#' #Input your password here
CSV_PATH = 'badhan_Titumir.csv' 
executable_path = r'C:\Users\DELL\Desktop\badhan_github\chromedriver-win64\chromedriver.exe' #Input your chromedriver path here


# --- Helper Functions ---
def nav_form_url(driver):
    """Navigates to the form URL and performs a hard reload to ensure a completely fresh state."""
    print("Navigating to donor creation form...")
    driver.get('https://badhan-buet-test-46eca.web.app/#/singleDonorCreation')
    print("Performing a hard reload to clear cache and state...")
    driver.execute_script("location.reload(true);")
    try:
        wait = WebDriverWait(driver, 30)
        wait.until(EC.visibility_of_element_located((By.XPATH, '//*[@id="newDonorNameTextBoxId"]')))
        print("Form has been hard-reloaded and is ready for the next entry.")
    except Exception as e:
        print("Error: Form did not load correctly after hard reload.")
        raise e

def check_for_duplicate(driver):
    """Checks if the 'See Duplicate' button appears after entering a phone number."""
    try:
        wait = WebDriverWait(driver, 5)
        wait.until(EC.visibility_of_element_located((By.ID, "donorCreationSeeDuplicateButtonId")))
        print("DUPLICATE DETECTED: A donor with this phone number already exists.")
        return True
    except TimeoutException:
        print("Phone number appears to be unique.")
        return False

def select_dropdown_option(driver, dropdown_xpath, option_text):
    """A robust function to handle clicking dropdowns and selecting an option."""
    wait = WebDriverWait(driver, 20)
    
    # 1. Click the main dropdown to open the list
    dropdown_element = wait.until(EC.element_to_be_clickable((By.XPATH, dropdown_xpath)))
    dropdown_element.click()
    
    # 2. Find the specific option element by its text
    option_xpath = f"//div[@class='v-list-item__title'][text()='{option_text}']"
    option_element = wait.until(EC.visibility_of_element_located((By.XPATH, option_xpath)))
    
    # 3. FIX: Scroll the option into view and PAUSE before clicking
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", option_element)
    time.sleep(0.5)

    # 4. Use the reliable JavaScript click
    driver.execute_script("arguments[0].click();", option_element)

# --- Stabilize the Browser with Chrome Options ---
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--start-maximized") 
chrome_options.add_argument("--no-sandbox") 
chrome_options.add_argument("--disable-gpu") 
chrome_options.add_argument("--disable-extensions") 
chrome_options.add_argument("--disable-dev-shm-usage")

service = Service(executable_path=executable_path)
driver = webdriver.Chrome(service=service, options=chrome_options)
driver.implicitly_wait(10)
print("Driver initiated with stability options")

# --- Login Process ---
driver.get(url)
print("URL opened")
wait = WebDriverWait(driver, 20)
user = wait.until(EC.visibility_of_element_located((By.XPATH, '//*[@id="signInPhoneTextBox"]')))
user.send_keys(userid)
print("User ID entered")
driver.find_element(By.XPATH, '//*[@id="signInPasswordTextBox"]').send_keys(password)
print("Password entered")
driver.find_element(By.XPATH, '//*[@id="signInButton"]').click()
print("Login button clicked")
print("Waiting for login to complete...")
time.sleep(15)
print("Login should be complete now.")

# --- Read and Prepare CSV Data ---
try:
    donor_data = pd.read_csv(CSV_PATH, dtype={'phone': str, 'studentId': str})
    if 'Donation Count' not in donor_data.columns: donor_data['Donation Count'] = 0
    if 'Platelet Donation Count' not in donor_data.columns: donor_data['Platelet Donation Count'] = 0
    donor_data['Donation Count'] = donor_data['Donation Count'].fillna(0)
    donor_data['Platelet Donation Count'] = donor_data['Platelet Donation Count'].fillna(0)
    print("CSV file read and prepared successfully.")
except Exception as e:
    print(f"Error reading CSV file: {e}")
    driver.quit()
    exit()

# --- Initial Navigation to Form ---
nav_form_url(driver)

# --- Main Loop to Fill Form ---
for index, row in donor_data.iterrows():
    try:
        wait = WebDriverWait(driver, 20)
        print(f"\nProcessing row {index+2} from CSV for: {row['name']}")

        wait.until(EC.visibility_of_element_located((By.XPATH, '//*[@id="newDonorNameTextBoxId"]'))).send_keys(row['name'])
        driver.find_element(By.XPATH, '//*[@id="newDonorPhoneTextBoxId"]').send_keys('0' + str(row['phone']))

        driver.find_element(By.XPATH, '//*[@id="newDonorStudentIdTextBoxId"]').send_keys(str(row['studentId']))
        
        if check_for_duplicate(driver):
            print(f"Skipping donor '{row['name']}' due to duplicate phone number.")
            nav_form_url(driver)
            continue
        # For blood group
        select_dropdown_option(driver, '//*[@id="newDonorBloodGroupDropDownId"]', str(row['Blood Group']).strip())
        print(f"Successfully selected blood group: {row['Blood Group']}")

        driver.find_element(By.XPATH, '//*[@id="newDonorRoomNumberTextFieldId"]').send_keys(str(row['roomNumber']))
        driver.find_element(By.XPATH, '//*[@id="newDonorAddressTextFieldId"]').send_keys(row['address'])
        # driver.find_element(By.XPATH, '//*[@id="newDonorDonationCountTextFieldId"]').send_keys(str(row['Donation Count']))
        # driver.find_element(By.XPATH, '//*[@id="newDonorPlateletDonationCountTextFieldId"]').send_keys(str(row['Platelet Donation Count']))
        
        # --- Scroll down after filling address ---
        print("Scrolling down to reveal more fields...")
        # Find the hall dropdown element to use as a scroll target
        hall_dropdown_element_for_scroll = driver.find_element(By.XPATH, '//*[@id="newDonorHallDropdownId"]')
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", hall_dropdown_element_for_scroll)
        time.sleep(0.5) # Pause to let the page settle after scrolling
        
        # For hall
        select_dropdown_option(driver, '//*[@id="newDonorHallDropdownId"]', str(row['Hall']).strip())
        print(f"Successfully selected hall: {row['Hall']}")
        
        # Add a pause for form validation to complete ---
        print("Pausing for form validation...")
        time.sleep(1)

        # --- Submit the Form ---
        submit_button = wait.until(EC.element_to_be_clickable((By.ID, "newDonorCreateButtonId")))
        driver.execute_script("arguments[0].click();", submit_button)
        print("CREATE button was enabled and has been clicked.")
        
        time.sleep(8)
        nav_form_url(driver)

    except Exception as e:
        print(f"FATAL ERROR on row {index} for {row['name']}. Error: {e}")
        driver.save_screenshot(f"error_row_{index}.png")
        print("Attempting to recover by reloading the form...")
        try:
            nav_form_url(driver)
        except Exception as recovery_e:
            print(f"Recovery failed. The browser may have crashed. Error: {recovery_e}")
            break # Exit the loop if recovery fails

# --- Clean Up ---
print("\nAutomation complete.")
driver.quit()