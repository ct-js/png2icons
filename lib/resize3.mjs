// This is an optimized version where the interpolate functions have been
// inlined. This gives a noticeable speed bump. Otherwise it's identical
// to the original file resize2.js, please see there.

export function nearestNeighbor(src, dst) {
    const wSrc = src.width;
    const hSrc = src.height;
    // console.log("wSrc="+wSrc + ", hSrc="+hSrc);
    const wDst = dst.width;
    const hDst = dst.height;
    // console.log("wDst="+wDst + ", hDst="+hDst);
    const bufSrc = src.data;
    const bufDst = dst.data;

    for (let i = 0; i < hDst; i++) {
        for (let j = 0; j < wDst; j++) {
            let posDst = (i * wDst + j) * 4;

            const iSrc = Math.floor((i * hSrc) / hDst);
            const jSrc = Math.floor((j * wSrc) / wDst);
            let posSrc = (iSrc * wSrc + jSrc) * 4;

            bufDst[posDst++] = bufSrc[posSrc++];
            bufDst[posDst++] = bufSrc[posSrc++];
            bufDst[posDst++] = bufSrc[posSrc++];
            bufDst[posDst++] = bufSrc[posSrc++];
        }
    }
}
export function bilinearInterpolation(src, dst) {
    const wSrc = src.width;
    const hSrc = src.height;
    // console.log("wSrc="+wSrc + ", hSrc="+hSrc);
    const wDst = dst.width;
    const hDst = dst.height;
    // console.log("wDst="+wDst + ", hDst="+hDst);
    const bufSrc = src.data;
    const bufDst = dst.data;

    const assign = function (pos, offset, x, xMin, xMax, y, yMin, yMax) {
        let posMin = (yMin * wSrc + xMin) * 4 + offset;
        let posMax = (yMin * wSrc + xMax) * 4 + offset;
        // const vMin = interpolate(
        //     x,
        //     xMin,
        //     bufSrc[posMin],
        //     xMax,
        //     bufSrc[posMax]
        // );
        const vMin = (xMin === xMax) ? bufSrc[posMin] : Math.round((x - xMin) * bufSrc[posMax] + (xMax - x) * bufSrc[posMin]);

        // special case, y is integer
        if (yMax === yMin) {
            bufDst[pos + offset] = vMin;
        } else {
            posMin = (yMax * wSrc + xMin) * 4 + offset;
            posMax = (yMax * wSrc + xMax) * 4 + offset;
            // const vMax = interpolate(
            //     x,
            //     xMin,
            //     bufSrc[posMin],
            //     xMax,
            //     bufSrc[posMax]
            // );
            const vMax = (xMin === xMax) ? bufSrc[posMin] : Math.round((x - xMin) * bufSrc[posMax] + (xMax - x) * bufSrc[posMin]);

            // bufDst[pos + offset] = interpolate(y, yMin, vMin, yMax, vMax);
            bufDst[pos + offset] = (yMin === yMax) ? vMin : Math.round((y - yMin) * vMax + (yMax - y) * vMin);
        }
    };

    for (let i = 0; i < hDst; i++) {
        for (let j = 0; j < wDst; j++) {
            const posDst = (i * wDst + j) * 4;
            // x & y in src coordinates
            const x = (j * wSrc) / wDst;
            const xMin = Math.floor(x);
            const xMax = Math.min(Math.ceil(x), wSrc - 1);

            const y = (i * hSrc) / hDst;
            const yMin = Math.floor(y);
            const yMax = Math.min(Math.ceil(y), hSrc - 1);

            assign(posDst, 0, x, xMin, xMax, y, yMin, yMax);
            assign(posDst, 1, x, xMin, xMax, y, yMin, yMax);
            assign(posDst, 2, x, xMin, xMax, y, yMin, yMax);
            assign(posDst, 3, x, xMin, xMax, y, yMin, yMax);
        }
    }
}
export function bicubicInterpolation(src, dst) {
    const bufSrc = src.data;
    const bufDst = dst.data;

    const wSrc = src.width;
    const hSrc = src.height;
    // console.log("wSrc="+wSrc + ", hSrc="+hSrc + ", srcLen="+bufSrc.length);
    const wDst = dst.width;
    const hDst = dst.height;
    // console.log("wDst="+wDst + ", hDst="+hDst + ", dstLen="+bufDst.length);
    // when dst smaller than src/2, interpolate first to a multiple between 0.5 and 1.0 src, then sum squares
    const wM = Math.max(1, Math.floor(wSrc / wDst));
    const wDst2 = wDst * wM;
    const hM = Math.max(1, Math.floor(hSrc / hDst));
    const hDst2 = hDst * hM;
    // console.log("wM="+wM + ", wDst2="+wDst2 + ", hM="+hM + ", hDst2="+hDst2);
    // ===========================================================
    // Pass 1 - interpolate rows
    // buf1 has width of dst2 and height of src
    const buf1 = Buffer.alloc(wDst2 * hSrc * 4);
    for (let i = 0; i < hSrc; i++) {
        for (let j = 0; j < wDst2; j++) {
            // i in src coords, j in dst coords
            // calculate x in src coords
            // this interpolation requires 4 sample points and the two inner ones must be real
            // the outer points can be fudged for the edges.
            // therefore (wSrc-1)/wDst2
            const x = (j * (wSrc - 1)) / wDst2;
            const xPos = Math.floor(x);
            const t = x - xPos;
            const srcPos = (i * wSrc + xPos) * 4;
            const buf1Pos = (i * wDst2 + j) * 4;

            for (let k = 0; k < 4; k++) {
                const kPos = srcPos + k;
                const x0 = xPos > 0
                    ? bufSrc[kPos - 4]
                    : 2 * bufSrc[kPos] - bufSrc[kPos + 4];
                const x1 = bufSrc[kPos];
                const x2 = bufSrc[kPos + 4];
                const x3 = xPos < wSrc - 2
                    ? bufSrc[kPos + 8]
                    : 2 * bufSrc[kPos + 4] - bufSrc[kPos];
                // buf1[buf1Pos + k] = interpolate(x0, x1, x2, x3, t);
                buf1[buf1Pos + k] = Math.max(0, Math.min(255, (x3 - x2 - x0 + x1) * (t * t * t) + (x0 - x1 - (x3 - x2 - x0 + x1)) * (t * t) + (x2 - x0) * t + x1));
            }
        }
    }
    // ===========================================================
    // Pass 2 - interpolate columns
    // buf2 has width and height of dst2
    const buf2 = Buffer.alloc(wDst2 * hDst2 * 4);
    for (let i = 0; i < hDst2; i++) {
        for (let j = 0; j < wDst2; j++) {
            // i&j in dst2 coords
            // calculate y in buf1 coords
            // this interpolation requires 4 sample points and the two inner ones must be real
            // the outer points can be fudged for the edges.
            // therefore (hSrc-1)/hDst2
            const y = (i * (hSrc - 1)) / hDst2;
            const yPos = Math.floor(y);
            const t = y - yPos;
            const buf1Pos = (yPos * wDst2 + j) * 4;
            const buf2Pos = (i * wDst2 + j) * 4;
            for (let k = 0; k < 4; k++) {
                const kPos = buf1Pos + k;
                const y0 = yPos > 0
                    ? buf1[kPos - wDst2 * 4]
                    : 2 * buf1[kPos] - buf1[kPos + wDst2 * 4];
                const y1 = buf1[kPos];
                const y2 = buf1[kPos + wDst2 * 4];
                const y3 = yPos < hSrc - 2
                    ? buf1[kPos + wDst2 * 8]
                    : 2 * buf1[kPos + wDst2 * 4] - buf1[kPos];

                // buf2[buf2Pos + k] = interpolate(y0, y1, y2, y3, t);
                buf2[buf2Pos + k] = Math.max(0, Math.min(255, (y3 - y2 - y0 + y1) * (t * t * t) + (y0 - y1 - (y3 - y2 - y0 + y1)) * (t * t) + (y2 - y0) * t + y1));
            }
        }
    }
    // ===========================================================
    // Pass 3 - scale to dst
    const m = wM * hM;
    if (m > 1) {
        for (let i = 0; i < hDst; i++) {
            for (let j = 0; j < wDst; j++) {
                // i&j in dst bounded coords
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                let realColors = 0;

                for (let y = 0; y < hM; y++) {
                    const yPos = i * hM + y;

                    for (let x = 0; x < wM; x++) {
                        const xPos = j * wM + x;
                        const xyPos = (yPos * wDst2 + xPos) * 4;
                        const pixelAplha = buf2[xyPos + 3];

                        if (pixelAplha) {
                            r += buf2[xyPos];
                            g += buf2[xyPos + 1];
                            b += buf2[xyPos + 2];
                            realColors++;
                        }

                        a += pixelAplha;
                    }
                }

                const pos = (i * wDst + j) * 4;
                bufDst[pos] = realColors ? Math.round(r / realColors) : 0;
                bufDst[pos + 1] = realColors
                    ? Math.round(g / realColors)
                    : 0;
                bufDst[pos + 2] = realColors
                    ? Math.round(b / realColors)
                    : 0;
                bufDst[pos + 3] = Math.round(a / m);
            }
        }
    } else {
        // replace dst buffer with buf2
        dst.data = buf2;
    }
}
export function hermiteInterpolation(src, dst) {
    const bufSrc = src.data;
    const bufDst = dst.data;

    const wSrc = src.width;
    const hSrc = src.height;
    // console.log("wSrc="+wSrc + ", hSrc="+hSrc + ", srcLen="+bufSrc.length);
    const wDst = dst.width;
    const hDst = dst.height;
    // console.log("wDst="+wDst + ", hDst="+hDst + ", dstLen="+bufDst.length);
    // when dst smaller than src/2, interpolate first to a multiple between 0.5 and 1.0 src, then sum squares
    const wM = Math.max(1, Math.floor(wSrc / wDst));
    const wDst2 = wDst * wM;
    const hM = Math.max(1, Math.floor(hSrc / hDst));
    const hDst2 = hDst * hM;
    // console.log("wM="+wM + ", wDst2="+wDst2 + ", hM="+hM + ", hDst2="+hDst2);
    // ===========================================================
    // Pass 1 - interpolate rows
    // buf1 has width of dst2 and height of src
    const buf1 = Buffer.alloc(wDst2 * hSrc * 4);
    for (let i = 0; i < hSrc; i++) {
        for (let j = 0; j < wDst2; j++) {
            // i in src coords, j in dst coords
            // calculate x in src coords
            // this interpolation requires 4 sample points and the two inner ones must be real
            // the outer points can be fudged for the edges.
            // therefore (wSrc-1)/wDst2
            const x = (j * (wSrc - 1)) / wDst2;
            const xPos = Math.floor(x);
            const t = x - xPos;
            const srcPos = (i * wSrc + xPos) * 4;
            const buf1Pos = (i * wDst2 + j) * 4;

            for (let k = 0; k < 4; k++) {
                const kPos = srcPos + k;
                const x0 = xPos > 0
                    ? bufSrc[kPos - 4]
                    : 2 * bufSrc[kPos] - bufSrc[kPos + 4];
                const x1 = bufSrc[kPos];
                const x2 = bufSrc[kPos + 4];
                const x3 = xPos < wSrc - 2
                    ? bufSrc[kPos + 8]
                    : 2 * bufSrc[kPos + 4] - bufSrc[kPos];
                // buf1[buf1Pos + k] = interpolate(x0, x1, x2, x3, t);
                buf1[buf1Pos + k] = Math.max(0, Math.min(255, Math.round((((0.5 * (x3 - x0) + 1.5 * (x1 - x2)) * t + (x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3)) * t + (0.5 * (x2 - x0))) * t + x1)));
            }
        }
    }
    // ===========================================================
    // Pass 2 - interpolate columns
    // buf2 has width and height of dst2
    const buf2 = Buffer.alloc(wDst2 * hDst2 * 4);
    for (let i = 0; i < hDst2; i++) {
        for (let j = 0; j < wDst2; j++) {
            // i&j in dst2 coords
            // calculate y in buf1 coords
            // this interpolation requires 4 sample points and the two inner ones must be real
            // the outer points can be fudged for the edges.
            // therefore (hSrc-1)/hDst2
            const y = (i * (hSrc - 1)) / hDst2;
            const yPos = Math.floor(y);
            const t = y - yPos;
            const buf1Pos = (yPos * wDst2 + j) * 4;
            const buf2Pos = (i * wDst2 + j) * 4;
            for (let k = 0; k < 4; k++) {
                const kPos = buf1Pos + k;
                const y0 = yPos > 0
                    ? buf1[kPos - wDst2 * 4]
                    : 2 * buf1[kPos] - buf1[kPos + wDst2 * 4];
                const y1 = buf1[kPos];
                const y2 = buf1[kPos + wDst2 * 4];
                const y3 = yPos < hSrc - 2
                    ? buf1[kPos + wDst2 * 8]
                    : 2 * buf1[kPos + wDst2 * 4] - buf1[kPos];

                // buf2[buf2Pos + k] = interpolate(y0, y1, y2, y3, t);
                buf2[buf2Pos + k] = Math.max(0, Math.min(255, Math.round((((0.5 * (y3 - y0) + 1.5 * (y1 - y2)) * t + (y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3)) * t + (0.5 * (y2 - y0))) * t + y1)));
            }
        }
    }
    // ===========================================================
    // Pass 3 - scale to dst
    const m = wM * hM;
    if (m > 1) {
        for (let i = 0; i < hDst; i++) {
            for (let j = 0; j < wDst; j++) {
                // i&j in dst bounded coords
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                let realColors = 0;

                for (let y = 0; y < hM; y++) {
                    const yPos = i * hM + y;

                    for (let x = 0; x < wM; x++) {
                        const xPos = j * wM + x;
                        const xyPos = (yPos * wDst2 + xPos) * 4;
                        const pixelAplha = buf2[xyPos + 3];

                        if (pixelAplha) {
                            r += buf2[xyPos];
                            g += buf2[xyPos + 1];
                            b += buf2[xyPos + 2];
                            realColors++;
                        }

                        a += pixelAplha;
                    }
                }

                const pos = (i * wDst + j) * 4;
                bufDst[pos] = realColors ? Math.round(r / realColors) : 0;
                bufDst[pos + 1] = realColors
                    ? Math.round(g / realColors)
                    : 0;
                bufDst[pos + 2] = realColors
                    ? Math.round(b / realColors)
                    : 0;
                bufDst[pos + 3] = Math.round(a / m);
            }
        }
    } else {
        // replace dst buffer with buf2
        dst.data = buf2;
    }
}
export function bezierInterpolation(src, dst) {
    const bufSrc = src.data;
    const bufDst = dst.data;

    const wSrc = src.width;
    const hSrc = src.height;
    // console.log("wSrc="+wSrc + ", hSrc="+hSrc + ", srcLen="+bufSrc.length);
    const wDst = dst.width;
    const hDst = dst.height;
    // console.log("wDst="+wDst + ", hDst="+hDst + ", dstLen="+bufDst.length);
    // when dst smaller than src/2, interpolate first to a multiple between 0.5 and 1.0 src, then sum squares
    const wM = Math.max(1, Math.floor(wSrc / wDst));
    const wDst2 = wDst * wM;
    const hM = Math.max(1, Math.floor(hSrc / hDst));
    const hDst2 = hDst * hM;
    // console.log("wM="+wM + ", wDst2="+wDst2 + ", hM="+hM + ", hDst2="+hDst2);
    // ===========================================================
    // Pass 1 - interpolate rows
    // buf1 has width of dst2 and height of src
    const buf1 = Buffer.alloc(wDst2 * hSrc * 4);
    for (let i = 0; i < hSrc; i++) {
        for (let j = 0; j < wDst2; j++) {
            // i in src coords, j in dst coords
            // calculate x in src coords
            // this interpolation requires 4 sample points and the two inner ones must be real
            // the outer points can be fudged for the edges.
            // therefore (wSrc-1)/wDst2
            const x = (j * (wSrc - 1)) / wDst2;
            const xPos = Math.floor(x);
            const t = x - xPos;
            const srcPos = (i * wSrc + xPos) * 4;
            const buf1Pos = (i * wDst2 + j) * 4;

            for (let k = 0; k < 4; k++) {
                const kPos = srcPos + k;
                const x0 = xPos > 0
                    ? bufSrc[kPos - 4]
                    : 2 * bufSrc[kPos] - bufSrc[kPos + 4];
                const x1 = bufSrc[kPos];
                const x2 = bufSrc[kPos + 4];
                const x3 = xPos < wSrc - 2
                    ? bufSrc[kPos + 8]
                    : 2 * bufSrc[kPos + 4] - bufSrc[kPos];
                // buf1[buf1Pos + k] = interpolate(x0, x1, x2, x3, t);
                buf1[buf1Pos + k] = Math.max(0, Math.min(255, Math.round((x1 * (1 - t) * (1 - t) * (1 - t)) + (3 * (x1 + (x2 - x0) / 4) * (1 - t) * (1 - t) * t) + (3 * (x2 - (x3 - x1) / 4) * (1 - t) * t * t) + (x2 * t * t * t))));
            }
        }
    }
    // ===========================================================
    // Pass 2 - interpolate columns
    // buf2 has width and height of dst2
    const buf2 = Buffer.alloc(wDst2 * hDst2 * 4);
    for (let i = 0; i < hDst2; i++) {
        for (let j = 0; j < wDst2; j++) {
            // i&j in dst2 coords
            // calculate y in buf1 coords
            // this interpolation requires 4 sample points and the two inner ones must be real
            // the outer points can be fudged for the edges.
            // therefore (hSrc-1)/hDst2
            const y = (i * (hSrc - 1)) / hDst2;
            const yPos = Math.floor(y);
            const t = y - yPos;
            const buf1Pos = (yPos * wDst2 + j) * 4;
            const buf2Pos = (i * wDst2 + j) * 4;
            for (let k = 0; k < 4; k++) {
                const kPos = buf1Pos + k;
                const y0 = yPos > 0
                    ? buf1[kPos - wDst2 * 4]
                    : 2 * buf1[kPos] - buf1[kPos + wDst2 * 4];
                const y1 = buf1[kPos];
                const y2 = buf1[kPos + wDst2 * 4];
                const y3 = yPos < hSrc - 2
                    ? buf1[kPos + wDst2 * 8]
                    : 2 * buf1[kPos + wDst2 * 4] - buf1[kPos];

                // buf2[buf2Pos + k] = interpolate(y0, y1, y2, y3, t);
                buf2[buf2Pos + k] = Math.max(0, Math.min(255, Math.round((y1 * (1 - t) * (1 - t) * (1 - t)) + (3 * (y1 + (y2 - y0) / 4) * (1 - t) * (1 - t) * t) + (3 * (y2 - (y3 - y1) / 4) * (1 - t) * t * t) + (y2 * t * t * t))));
            }
        }
    }
    // ===========================================================
    // Pass 3 - scale to dst
    const m = wM * hM;
    if (m > 1) {
        for (let i = 0; i < hDst; i++) {
            for (let j = 0; j < wDst; j++) {
                // i&j in dst bounded coords
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                let realColors = 0;

                for (let y = 0; y < hM; y++) {
                    const yPos = i * hM + y;

                    for (let x = 0; x < wM; x++) {
                        const xPos = j * wM + x;
                        const xyPos = (yPos * wDst2 + xPos) * 4;
                        const pixelAplha = buf2[xyPos + 3];

                        if (pixelAplha) {
                            r += buf2[xyPos];
                            g += buf2[xyPos + 1];
                            b += buf2[xyPos + 2];
                            realColors++;
                        }

                        a += pixelAplha;
                    }
                }

                const pos = (i * wDst + j) * 4;
                bufDst[pos] = realColors ? Math.round(r / realColors) : 0;
                bufDst[pos + 1] = realColors
                    ? Math.round(g / realColors)
                    : 0;
                bufDst[pos + 2] = realColors
                    ? Math.round(b / realColors)
                    : 0;
                bufDst[pos + 3] = Math.round(a / m);
            }
        }
    } else {
        // replace dst buffer with buf2
        dst.data = buf2;
    }
}
