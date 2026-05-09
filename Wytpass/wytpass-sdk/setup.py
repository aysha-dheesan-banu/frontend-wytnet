from setuptools import setup, find_packages

setup(
    name='wytpass-sdk',
    version='1.0.0',
    packages=find_packages(),
    install_requires=['httpx', 'fastapi'],
)
