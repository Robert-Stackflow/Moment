import logging
import sys


def setup_logger():
    _logger = logging.getLogger("Moment")
    _logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(formatter)

    _logger.addHandler(console_handler)

    return _logger


logger = setup_logger()
