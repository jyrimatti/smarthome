#!/bin/sh

servicedir=$HOME/.config/systemd/user
configdir=$HOME/.config/nginx

if [ ! -d "$configdir" ]; then
    echo "Creating $configdir..."
    mkdir -p "$configdir"
fi

if [ ! -d "$servicedir" ]; then
    echo "Creating $servicedir..."
    mkdir -p "$servicedir"
fi

echo "Creating $servicedir/nginx.service..."
cat > "$servicedir/nginx.service" << EOF
[Unit]
Description=nginx
After=network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=exec
SupplementaryGroups=acme
RuntimeDirectory=nginx
LogsDirectory=nginx
CacheDirectory=nginx

ExecStart=/home/pi/.nix-profile/bin/nginx -c $configdir/nginx.conf
ExecReload=/bin/kill -HUP $MAINPID

Restart=on-failure
RestartSec=10s

# filesystem access
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectControlGroups=true
ProtectKernelModules=true
ProtectKernelTunables=true

# network
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

# misc
SystemCallArchitectures=native
NoNewPrivileges=true
RestrictRealtime=true
MemoryDenyWriteExecute=true
ProtectKernelLogs=true
LockPersonality=true
ProtectHostname=true
RemoveIPC=true
RestrictSUIDSGID=true
ProtectClock=true

# capabilities
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd config..."
systemctl --user daemon-reload

echo "Enabling nginx.service..."
systemctl --user enable nginx

echo "Enabling user process lingering for $USER..."
loginctl enable-linger "$USER"

echo "Done! Nginx will now start on boot."
echo "You can start it manually with 'systemctl --user start nginx.service'"
echo "Follow logs with 'journalctl -f -t nginx'"