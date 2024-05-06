
from flask import Flask, request
from flask_cors import CORS, cross_origin
import logging

from mobile_sam import sam_model_registry, SamAutomaticMaskGenerator, SamPredictor
import torch
import numpy as np

app = Flask(__name__)
CORS(app)

sam_checkpoint = '../model/mobile_sam.pt'
model_type = 'vit_t'
device = "cuda" if torch.cuda.is_available() else "cpu"
sam  = sam_model_registry[model_type](checkpoint=sam_checkpoint)
sam.to(device=device)
sam.eval()
predictor = SamPredictor(sam)

@app.route("/image", methods=['POST'])
def create_embedding():
    print(request.get_json())
    image = request.json['data']
    image = np.array(image, dtype=np.uint8)
    predictor.set_image(image)
    embedding = predictor.get_image_embedding().numpy()
    print(embedding.shape)
    return embedding.tolist()
