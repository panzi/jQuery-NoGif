#!/bin/bash

i=1
while [ $i -lt 26 ]; do
	convert -size 50x50 xc:none -pointsize 42 -channel RGBA -font "Bitstream-Vera-Sans-Mono-Bold" \
		-fill red -draw "text 0,42 '`printf %02d $i`'" nogif1-`printf %03d $((i-1))`.png || exit 1
	i=$((i+1))
done

convert -size 50x50 xc:none -channel RGBA -fill green -draw "polygon 5,5 45,25 5,45" nogif2-placeholder.png

i=1
while [ $i -lt 4 ]; do
	convert -size 50x50 xc:none -pointsize 42 -channel RGBA -font "Bitstream-Vera-Sans-Mono-Bold" \
		-fill green -draw "text 0,42 '`printf %02d $i`'" nogif2-`printf %03d $i`.png || exit 1
	i=$((i+1))
done

i=1
while [ $i -lt 5 ]; do
	convert -size 50x50 xc:none -pointsize 42 -channel RGBA -font "Bitstream-Vera-Sans-Mono-Bold" \
		-fill blue -draw "text 0,42 '`printf %02d $i`'" nogif3-`printf %03d $i`.png || exit 1
	i=$((i+1))
done
