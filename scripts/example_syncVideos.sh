#!/bin/bash

# Define the local and remote paths
LOCAL_PATH="/var/www/videos/"
REMOTE_USER="azureuser"
REMOTE_SERVER="secondary-server-ip"
REMOTE_PATH="/var/www/videos/"

# Sync downloads folder from current server to the secondary server
rsync -avz -e "ssh -o StrictHostKeyChecking=no" $LOCAL_PATH $REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH

# Sync downloads folder from secondary server to the current server
rsync -avz -e "ssh -o StrictHostKeyChecking=no" $REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH $LOCAL_PATH

