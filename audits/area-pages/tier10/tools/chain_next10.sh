#!/bin/bash
# chain_next10.sh: wait for the California resume run to finish, then apply the rest in one resumable run.
T=/Users/nathanbarber/.claude/jobs/d56fff32/tmp
while pgrep -f "resume_list10.sh 534 " > /dev/null; do sleep 60; done
L="545 546 547 549 560 563"
for n in $(seq 606 687) 910 911 912; do L="$L $n"; done
DONE=$T/resume10b.done ALL=$T/resume10b-all.log bash $T/resume_list10.sh $L
