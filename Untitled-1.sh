#!/bin/bash

# Define variables
REMOTE_USER=""
REMOTE_SERVER=""

# Copy SSH public key to the remote server
sshpass -p '' ssh-copy-id $REMOTE_USER@$REMOTE_SERVER
