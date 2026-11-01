import os

# Keyless API access is a deliberate local-development switch; the suite runs the API that way unless a test turns it off.
os.environ.setdefault('FINSIGHT_INSECURE_DEV', '1')
