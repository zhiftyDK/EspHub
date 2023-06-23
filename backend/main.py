import sys
sys.dont_write_bytecode = True

# When reffering to specific files in python you have to start from the root
# This is done because the python file is executed from nodejs
# If you want to refer to this file you would do 'backend/main.py'

# You can always print something in the console when testing the backend
print("Hello from python")

# To send something to the frontend, you do the following
from modules import frontend
frontend.send("Hello from python frontend.py")