#!/bin/bash

# Update and install gnuplot
sudo apt-get update && sudo apt-get install -y gnuplot

npm install
npm run build

# Remove existing results file
rm -f results.md

# Loop through each benchmark (1, 2, 3)
for bench in 1 2 3; do
    echo "Processing files for bench${bench}:"

    shopt -s nullglob
    files=(bench${bench}_result*_graphql_*_run.sh.txt)
    shopt -u nullglob

    if [ ${#files[@]} -gt 0 ]; then
        cmd="node dist/analyze.js ${files[*]}"
        echo "Executing: $cmd"
        node dist/analyze.js "${files[@]}"
    fi
done
