import cv2
import os
img = cv2.imread("Badhan.png")
original_image_height = img.shape[0]
original_image_width = img.shape[1]
print(f"original_dim: {(original_image_height, original_image_width)}")

if not os.path.exists('asset'):
    os.makedirs('asset')

def crop_scale(folder_name, frame_width, frame_height):
    original_width_height_ratio = original_image_width / original_image_height
    frame_width_height_ratio = frame_width / frame_height

    if original_width_height_ratio > frame_width_height_ratio:
        crop_width = (original_image_height / frame_height)*frame_width
        crop_height = original_image_height
    else:
        crop_height = (original_image_width/ frame_width) * frame_height
        crop_width = original_image_width

    crop_upper_left_x = int((original_image_width/2) - (crop_width/2))
    crop_lower_right_x = int((original_image_width/2) + (crop_width/2) )
    crop_upper_left_y = int((original_image_height/2) - (crop_height/2) )
    crop_lower_right_y = int((original_image_height/2) + (crop_height/2) )

    crop_img = img[crop_upper_left_y:crop_lower_right_y, crop_upper_left_x:crop_lower_right_x]
    scaled_img = cv2.resize(crop_img, (frame_width,frame_height))
    if not os.path.exists('asset/'+folder_name):
        os.makedirs('asset/'+folder_name)
    cv2.imwrite('asset/'+folder_name+'/splash.png',scaled_img)

f = open("specs.txt", "r")
for x in f:
    config = x.split(' ')
    crop_scale(config[0],int(config[1]),int(config[2]))