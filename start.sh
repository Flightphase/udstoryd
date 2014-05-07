#!/bin/bash

# Invoke the Forever module (to START our Node.js server).
forever start -a -l forever.log -o out.log -e err.log udstoryd.js