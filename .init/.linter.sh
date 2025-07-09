#!/bin/bash
cd /home/kavia/workspace/code-generation/tictactoesync-71385-2e99fa35/tic_tac_toe_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

