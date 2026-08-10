package jsonapi

import (
	"bytes"
	"compress/gzip"
	"crypto/md5"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"image"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"unicode"

	"github.com/klauspost/compress/zstd"
)

// Blender stores file thumbnails following the Freedesktop Thumbnail Managing
// Standard. Cache layout differs by platform (see blender/imbuf/intern/thumbs.cc).
//
// Lookup order: OS cache (large, then normal), then embedded TEST chunk in the blend file.

const (
	blendThumbREND = "REND"
	blendThumbTEST = "TEST"
)

// acceptable maps ASCII chars 32..127 to a bitmask of allowed URI character sets.
// Bit 0x8 is UNSAFE_PATH (allows '/', '&', '=', ':', '@', '+', '$', ',').
var acceptable = [96]byte{
	0x00, 0x3F, 0x20, 0x20, 0x28, 0x00, 0x2C, 0x3F, 0x3F, 0x3F, 0x3F, 0x2A, 0x28, 0x3F, 0x3F, 0x1C,
	0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x38, 0x20, 0x20, 0x2C, 0x20, 0x20,
	0x38, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F,
	0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x20, 0x20, 0x20, 0x20, 0x3F,
	0x20, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F,
	0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x20, 0x20, 0x20, 0x3F, 0x20,
}

const uriUnsafePath = 0x8

func loadBlendThumbnail(absPath string) ([]byte, error) {
	canonical, err := canonicalBlendPath(absPath)
	if err != nil {
		return nil, err
	}

	if data, err := lookupBlenderCachedThumbnail(canonical); err == nil && len(data) > 0 {
		return data, nil
	}

	if data, err := extractBlendEmbeddedThumbnail(absPath); err == nil && len(data) > 0 {
		return data, nil
	}

	return nil, fmt.Errorf("blend thumbnail not found")
}

func canonicalBlendPath(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	abs = filepath.Clean(abs)
	if resolved, err := filepath.EvalSymlinks(abs); err == nil {
		abs = resolved
	}
	if runtime.GOOS == "windows" {
		abs = normalizeWindowsPath(abs)
	}
	return abs, nil
}

func normalizeWindowsPath(path string) string {
	if len(path) >= 2 && path[1] == ':' {
		letter := unicode.ToUpper(rune(path[0]))
		return string(letter) + path[1:]
	}
	return path
}

func blenderFileURI(absPath string) (string, error) {
	var orig string

	if runtime.GOOS == "windows" {
		p := strings.ReplaceAll(absPath, "\\", "/")
		if strings.HasPrefix(p, "//") {
			orig = "file://" + strings.TrimPrefix(p, "/")
		} else if len(p) >= 2 && p[1] == ':' {
			orig = "file:///" + p
			if len(orig) >= 9 {
				runes := []rune(orig)
				runes[8] = unicode.ToUpper(runes[8])
				orig = string(runes)
			}
		} else {
			return "", fmt.Errorf("not an absolute windows path: %s", absPath)
		}
	} else {
		if !filepath.IsAbs(absPath) {
			return "", fmt.Errorf("not an absolute path: %s", absPath)
		}
		orig = "file://" + absPath
	}

	return escapeBlenderFileURI(orig), nil
}

func escapeBlenderFileURI(s string) string {
	const hexChars = "0123456789abcdef"
	var b strings.Builder
	b.Grow(len(s))

	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 32 && c < 128 && (acceptable[c-32]&uriUnsafePath) != 0 {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte(hexChars[c>>4])
		b.WriteByte(hexChars[c&0x0f])
	}
	return b.String()
}

func blenderThumbHash(uri string) string {
	sum := md5.Sum([]byte(uri))
	return hex.EncodeToString(sum[:])
}

func blenderThumbnailBaseDirs() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	var bases []string
	switch runtime.GOOS {
	case "linux":
		if cacheHome := strings.TrimSpace(os.Getenv("XDG_CACHE_HOME")); cacheHome != "" {
			bases = append(bases, filepath.Join(cacheHome, "thumbnails"))
		} else {
			bases = append(bases, filepath.Join(home, ".cache", "thumbnails"))
		}
		bases = append(bases, filepath.Join(home, ".thumbnails"))
	default:
		bases = append(bases, filepath.Join(home, ".thumbnails"))
		if cacheHome := strings.TrimSpace(os.Getenv("XDG_CACHE_HOME")); cacheHome != "" {
			bases = append(bases, filepath.Join(cacheHome, "thumbnails"))
		}
	}
	return bases
}

func lookupBlenderCachedThumbnail(absPath string) ([]byte, error) {
	uri, err := blenderFileURI(absPath)
	if err != nil {
		return nil, err
	}
	name := blenderThumbHash(uri) + ".png"

	for _, base := range blenderThumbnailBaseDirs() {
		for _, size := range []string{"large", "normal"} {
			candidate := filepath.Join(base, size, name)
			data, err := os.ReadFile(candidate)
			if err == nil && len(data) > 0 {
				if int64(len(data)) > maxThumbnailBytes {
					continue
				}
				return data, nil
			}
		}
	}
	return nil, fmt.Errorf("cached thumbnail missing")
}

func extractBlendEmbeddedThumbnail(absPath string) ([]byte, error) {
	raw, err := os.ReadFile(absPath)
	if err != nil {
		return nil, err
	}
	return extractBlendThumbnailFromBytes(raw)
}

func blendFileBodyOffset(raw []byte) (headerEnd int, pointerSize int, bigEndian bool) {
	pointerSize = 8
	bigEndian = false
	headerEnd = 12

	if len(raw) < 12 || !bytes.HasPrefix(raw, []byte("BLENDER")) {
		return headerEnd, pointerSize, bigEndian
	}

	switch raw[7] {
	case '-':
		pointerSize = 4
		bigEndian = raw[8] == 'V'
	case '_':
		bigEndian = raw[8] == 'V'
	default:
		// Blender 4.x: BLENDER + file version (e.g. "17-01") + endian marker + build (e.g. "v050")
		headerEnd = 17
		if len(raw) > 12 && (raw[12] == 'v' || raw[12] == 'V') {
			bigEndian = raw[12] == 'V'
		}
	}

	return headerEnd, pointerSize, bigEndian
}

func readBlendTESTChunkFromData(data []byte) (int, int, []byte, error) {
	raw, err := blendPayloadBytes(data)
	if err != nil {
		return 0, 0, nil, err
	}
	headerEnd, pointerSize, bigEndian := blendFileBodyOffset(raw)

	var readU32 func([]byte) uint32
	var readInt func([]byte) int32
	if bigEndian {
		readU32 = binary.BigEndian.Uint32
		readInt = func(b []byte) int32 { return int32(binary.BigEndian.Uint32(b)) }
	} else {
		readU32 = binary.LittleEndian.Uint32
		readInt = func(b []byte) int32 { return int32(binary.LittleEndian.Uint32(b)) }
	}

	bheadSize := 24
	if pointerSize == 4 {
		bheadSize = 20
	}

	off := headerEnd
	for off+bheadSize <= len(raw) {
		code := string(raw[off : off+4])
		length := int(readU32(raw[off+4 : off+8]))
		payloadStart := off + bheadSize
		payloadEnd := payloadStart + length
		if length < 0 || payloadEnd > len(raw) {
			return 0, 0, nil, fmt.Errorf("invalid blend block %q", code)
		}

		if code == blendThumbREND {
			off = payloadEnd
			continue
		}
		if code != blendThumbTEST {
			off = payloadEnd
			continue
		}

		if length < 8 {
			return 0, 0, nil, fmt.Errorf("invalid TEST chunk size")
		}
		width := int(readInt(raw[payloadStart : payloadStart+4]))
		height := int(readInt(raw[payloadStart+4 : payloadStart+8]))
		payloadLen := length - 8
		if width <= 0 || height <= 0 || payloadLen != width*height*4 {
			return 0, 0, nil, fmt.Errorf("invalid TEST chunk size")
		}
		rgba := make([]byte, payloadLen)
		copy(rgba, raw[payloadStart+8:payloadEnd])
		return width, height, rgba, nil
	}

	return 0, 0, nil, fmt.Errorf("TEST chunk not found")
}

func blendPayloadBytes(data []byte) ([]byte, error) {
	reader, err := blendPayloadReader(data)
	if err != nil {
		return nil, err
	}
	return io.ReadAll(reader)
}

func extractBlendThumbnailFromBytes(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty blend data")
	}
	width, height, rgba, err := readBlendTESTChunkFromData(data)
	if err != nil {
		return nil, err
	}
	return rgbaToPNG(width, height, rgba)
}

func blendPayloadReader(data []byte) (io.ReadSeeker, error) {
	if len(data) < 12 {
		return nil, fmt.Errorf("unsupported blend compression")
	}
	if bytes.HasPrefix(data, []byte("BLENDER")) {
		return bytes.NewReader(data), nil
	}
	if data[0] == 0x1f && data[1] == 0x8b {
		gz, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		defer gz.Close()
		payload, err := io.ReadAll(gz)
		if err != nil {
			return nil, err
		}
		return bytes.NewReader(payload), nil
	}
	if len(data) >= 4 && data[0] == 0x28 && data[1] == 0xb5 && data[2] == 0x2f && data[3] == 0xfd {
		decoder, err := zstd.NewReader(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		defer decoder.Close()
		payload, err := io.ReadAll(decoder)
		if err != nil {
			return nil, err
		}
		return bytes.NewReader(payload), nil
	}
	return nil, fmt.Errorf("unsupported blend compression")
}

func rgbaToPNG(width, height int, rgba []byte) ([]byte, error) {
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	rowBytes := width * 4
	for y := 0; y < height; y++ {
		srcRow := (height - 1 - y) * rowBytes
		dstRow := y * img.Stride
		copy(img.Pix[dstRow:dstRow+rowBytes], rgba[srcRow:srcRow+rowBytes])
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
