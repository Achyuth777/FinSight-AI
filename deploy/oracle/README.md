# Hosting FinSight AI on Oracle Cloud Always Free

One VM runs everything: Caddy (HTTPS) → Next.js web app (port 3000) → FastAPI backend (port 8000, loopback only) → SQLite file on the VM's own disk. Nothing is exposed except ports 80 and 443. The web app reaches the backend over `http://127.0.0.1:8000`, which it accepts because loopback traffic never leaves the machine.

## 1. Create the VM (Oracle console, you do this)

1. Sign up at cloud.oracle.com. Pick the home region closest to you (Mumbai or Hyderabad for India). It cannot be changed later. A card is used for identity verification; Always Free resources are not charged.
2. Compute → Instances → Create instance.
   - Image: **Canonical Ubuntu 24.04**.
   - Shape: Change shape → Ampere → **VM.Standard.A1.Flex**, 2 OCPU, 12 GB RAM (the free allowance is 4 OCPU / 24 GB in total). If you see "Out of capacity", retry later or try another availability domain.
   - Networking: keep "Assign a public IPv4 address".
   - SSH keys: "Generate a key pair" and **download the private key** (keep it safe; there is no other way in).
3. When it is running, copy its **public IP**.
4. Open the web ports: instance page → the subnet → Security List → Add Ingress Rules. Add source `0.0.0.0/0`, TCP, destination port `80`, and again for `443`. (Port 22 for SSH is already open.)

## 2. Get a free hostname

At duckdns.org sign in, create a subdomain (for example `finsight-demo`), and set its IP to the VM's public IP. Your address will be `finsight-demo.duckdns.org`.

## 3. Install

From your PC (Windows PowerShell; adjust the key path):

```
ssh -i C:\path\to\ssh-key.key ubuntu@<public-ip>
```

On the VM:

```
curl -fsSL https://raw.githubusercontent.com/Achyuth777/FinSight-AI/main/deploy/oracle/setup.sh -o setup.sh
bash setup.sh finsight-demo.duckdns.org
```

It asks once for the workspace password (16+ characters) and generates the other secrets itself. It takes several minutes on the first run (installing scikit-learn, XGBoost and building the web app).

Open `https://finsight-demo.duckdns.org`. The first visit takes a few seconds while Caddy gets the certificate.

## Operating it

| Task | Command (on the VM) |
|---|---|
| Update to the latest code | `bash /opt/finsight/deploy/oracle/setup.sh finsight-demo.duckdns.org` (keeps secrets and data) |
| Backend logs | `sudo journalctl -u finsight-backend -f` |
| Web app logs | `sudo journalctl -u finsight-web -f` |
| Restart | `sudo systemctl restart finsight-backend finsight-web` |
| Back up the database | `sudo cp /var/lib/finsight/finsight.db ~/finsight-$(date +%F).db` |
| Change the password | edit `/etc/finsight.env` (root only), then restart both services |

## Notes

- Keep the backend to one worker (`--workers 1`): case writes are serialised by an in-process lock and sign-in throttling is per process.
- Oracle can reclaim Always Free VMs that stay almost completely idle for a long period. Visit the app now and then.
- The database holds everything (runs, cases, notes). Back it up before rebuilding the VM.
- Secrets live only in `/etc/finsight.env`. Never commit them.
