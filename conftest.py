import os
import sys

# El backend (FastAPI) vive en su propio directorio; se agrega al path para
# que pytest y pytest-cov lo encuentren al correr desde la raíz del repo.
sys.path.insert(
    0,
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "servicios-abrego", "backend-a-fastapi"),
)
