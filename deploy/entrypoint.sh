#!/bin/sh
set -e

nginx
cd app
python migrations/migration_1.py
python run.py