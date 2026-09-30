package moment

import (
	"encoding/binary"
	"image"
	"io"
)

// JPEG APP1 is at most 64 KiB. Read only the EXIF block and IFD0 orientation,
// without retaining metadata (including GPS) in the generated thumbnail.
func jpegOrientation(input io.ReadSeeker) int {
	if _, err := input.Seek(0, io.SeekStart); err != nil {
		return 1
	}
	var header [2]byte
	if _, err := io.ReadFull(input, header[:]); err != nil || header != [2]byte{0xff, 0xd8} {
		return 1
	}
	for scanned := int64(2); scanned < thumbnailBytes; {
		if _, err := io.ReadFull(input, header[:]); err != nil || header[0] != 0xff {
			return 1
		}
		marker := header[1]
		for marker == 0xff {
			if _, err := io.ReadFull(input, header[1:]); err != nil {
				return 1
			}
			marker = header[1]
		}
		if marker == 0xda || marker == 0xd9 {
			return 1
		}
		if marker == 0x01 || marker >= 0xd0 && marker <= 0xd7 {
			continue
		}
		if _, err := io.ReadFull(input, header[:]); err != nil {
			return 1
		}
		length := int(binary.BigEndian.Uint16(header[:])) - 2
		if length < 0 {
			return 1
		}
		scanned += int64(length + 4)
		if marker == 0xe1 {
			data := make([]byte, length)
			if _, err := io.ReadFull(input, data); err != nil {
				return 1
			}
			if len(data) >= 6 && string(data[:6]) == "Exif\x00\x00" {
				return tiffOrientation(data[6:])
			}
		} else {
			if _, err := input.Seek(int64(length), io.SeekCurrent); err != nil {
				return 1
			}
		}
	}
	return 1
}
func tiffOrientation(data []byte) int {
	if len(data) < 8 {
		return 1
	}
	var order binary.ByteOrder
	switch string(data[:2]) {
	case "II":
		order = binary.LittleEndian
	case "MM":
		order = binary.BigEndian
	default:
		return 1
	}
	if order.Uint16(data[2:4]) != 42 {
		return 1
	}
	offset := uint64(order.Uint32(data[4:8]))
	if offset+2 > uint64(len(data)) {
		return 1
	}
	count := int(order.Uint16(data[offset : offset+2]))
	offset += 2
	for i := 0; i < count; i++ {
		if offset+12 > uint64(len(data)) {
			return 1
		}
		entry := data[offset : offset+12]
		offset += 12
		if order.Uint16(entry[:2]) == 0x112 && order.Uint16(entry[2:4]) == 3 && order.Uint32(entry[4:8]) == 1 {
			value := int(order.Uint16(entry[8:10]))
			if value >= 1 && value <= 8 {
				return value
			}
			return 1
		}
	}
	return 1
}
func animatedPNG(input io.ReadSeeker) bool {
	if _, err := input.Seek(8, io.SeekStart); err != nil {
		return false
	}
	var header [8]byte
	for scanned := int64(8); scanned < thumbnailBytes; {
		if _, err := io.ReadFull(input, header[:]); err != nil {
			return false
		}
		kind := string(header[4:8])
		if kind == "acTL" {
			return true
		}
		if kind == "IDAT" || kind == "IEND" {
			return false
		}
		length := int64(binary.BigEndian.Uint32(header[:4]))
		if length > thumbnailBytes {
			return false
		}
		scanned += length + 12
		if _, err := input.Seek(length+4, io.SeekCurrent); err != nil {
			return false
		}
	}
	return false
}
func orientThumbnail(source *image.NRGBA, orientation int) *image.NRGBA {
	if orientation < 2 || orientation > 8 {
		return source
	}
	w, h := source.Bounds().Dx(), source.Bounds().Dy()
	width, height := w, h
	if orientation >= 5 {
		width, height = h, w
	}
	result := image.NewNRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			sx, sy := x, y
			switch orientation {
			case 2:
				sx = w - 1 - x
			case 3:
				sx, sy = w-1-x, h-1-y
			case 4:
				sy = h - 1 - y
			case 5:
				sx, sy = y, x
			case 6:
				sx, sy = y, h-1-x
			case 7:
				sx, sy = w-1-y, h-1-x
			case 8:
				sx, sy = w-1-y, x
			}
			result.SetNRGBA(x, y, source.NRGBAAt(sx, sy))
		}
	}
	return result
}
