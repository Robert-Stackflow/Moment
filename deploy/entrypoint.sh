#!/bin/sh
set -e

nginx
cd app
python run.py