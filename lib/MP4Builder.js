(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4Builder", function moduleClosure(global, WebModule, VERIFY, VERBOSE) {
"use strict";

// --- technical terms / data structure --------------------
/*

- MP4StreamObject
    - stream: Uint8Array
    - diagnostic: Object

```js
MP4BoxTreeObject = {
    root: {
        ftyp: {},
        moov: {
            mvhd: {},
            trak: {
                tkhd: {},
                edts: {
                    elst: {},
                },
                mdia: {
                    mdhd: {},
                    hdlr: {},
                    minf: {
                        vmhd: {},
                        dinf: {
                            dref: {},
                        },
                        stbl: {
                            stsd: {
                                avc1: {
                                    avcC: {},
                                },
                            },
                            stts: {},
                            stss: {},
                            stsc: {},
                            stsz: {},
                            stco: {},
                        },
                    },
                },
            },
            udta: {
                meta: {
                    hdlr: {},
                    ilst: {},
                },
            },
        },
        free: {},
        mdat: {},
    },
};
```

 */
// --- dependency modules ----------------------------------
var MP4Parser = WebModule["MP4Parser"];
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
var MP4Builder = {
    "VERBOSE":      VERBOSE,
    "build":        MP4Builder_build, // MP4Builder.build(tree:MP4BoxTreeObject, options:Object = {}):MP4StreamObject - { stream:Uint8Array, diagnostic:Object }
    "repository":   "https://github.com/uupaa/MP4Builder.js",
};

// --- implements ------------------------------------------
function MP4Builder_build(tree,      // @arg MP4BoxTreeObject - { root: { ftyp, moov: {...}, free, mdat } }
                          options) { // @arg Object = {} - { fastStart:Boolean = false, diagnostic:Boolean = false }
                                     // @options.fastStart Boolean = false
                                     // @ret MP4StreamObject - { stream:Uint8Array, diagnostic:Object }. MP4 file stream(ISO Base Media Format) and diagnostic info.
    options = options || {};

    var fastStart  = options["fastStart"]  || false;
    var diagnostic = null; // DiagnosticInformationObject

    if (options["diagnostic"]) {
        diagnostic = {
            "detail":   [],
            "boxes":    [],
        };
    }
    var streamObject = _buildBoxes(tree, diagnostic); // MP4StreamObject - { stream:Uint8Array, diagnostic:Object }

    if (fastStart) {
        return _overwrite_stco_chunk_offset(streamObject);
    }
    return streamObject; // { stream, diagnostic }
}

function _overwrite_stco_chunk_offset(streamObject) { // @arg MP4StreamObject
                                                      // @ret MP4StreamObject
    var stream  = streamObject["stream"];
    var mp4Tree = MP4Parser["parse"](stream);
    var offset  = mp4Tree["root"]["mdat"]["BoxHead"] + 8;
    var cursor  = _get_stco_chunkOffsetPosition(mp4Tree, 0);
    var after_stco_chunk_offset_value = offset;
    var before_stco_chunk_offset_value = stream[cursor + 0] << 24 |
                                         stream[cursor + 1] << 16 |
                                         stream[cursor + 2] <<  8 |
                                         stream[cursor + 3];

    // overwrite stco.chunk_offset value
    stream[cursor + 0] = (offset >> 24) & 0xff;
    stream[cursor + 1] = (offset >> 16) & 0xff;
    stream[cursor + 2] = (offset >>  8) & 0xff;
    stream[cursor + 3] = (offset >>  0) & 0xff;

    if (MP4Builder["VERBOSE"]) {
        if (before_stco_chunk_offset_value !== after_stco_chunk_offset_value) {
            console.log("overwrite stco.chunk_offset value:", before_stco_chunk_offset_value, " to ", after_stco_chunk_offset_value);
        }
    }
    return streamObject;

    function _get_stco_chunkOffsetPosition(tree, trackIndex) {
        //  aligned(8) class ChunkOffsetBox extends FullBox('stco', version = 0, 0) {
        //      unsigned int(32) entry_count;
        //      for (i=1; i <= entry_count; i++) {
        //          unsigned int(32) chunk_offset;
        //      }
        //  }
        var FULLBOX_HEAD_SIZE = 12; // BoxSize(4) + BoxType(4) + version(1) + flags(3)
        var ENTRY_COUNT_SIZE  =  4; // entry_count(4)

        return tree["root"]["moov"]["trak"][trackIndex]["mdia"]["minf"]["stbl"]["stco"]["BoxHead"] +
                FULLBOX_HEAD_SIZE + ENTRY_COUNT_SIZE;
    }
}

function _buildBoxes(tree,         // @arg MP4BoxTreeObject - MP4Parser.parse result value. { BoxHead, BoxSize, BoxType, root, diagnostic }
                     diagnostic) { // @arg Object
                                   // @ret MP4StreamObject - { stream, diagnostic }
    var root = {
            BoxPath:    "",
            BoxType:    "root",
            BoxSize:    0,
            cursor:     0,
            source:     [],
        };
    var videoTrack = null;
  //var audioTrack = null;

    if (_findBoxByPath(tree, "moov/trak:0")) {
        videoTrack = {
            tkhd: _tkhd(tree, diagnostic, "moov/trak:0/tkhd"),
            edts: _edts(tree, diagnostic, "moov/trak:0/edts"),
            elst: _elst(tree, diagnostic, "moov/trak:0/edts/elst"),
            mdia: _mdia(tree, diagnostic, "moov/trak:0/mdia"),
            mdhd: _mdhd(tree, diagnostic, "moov/trak:0/mdia/mdhd"),
            hdlr: _hdlr(tree, diagnostic, "moov/trak:0/mdia/hdlr"),
            minf: _minf(tree, diagnostic, "moov/trak:0/mdia/minf"),
            vmhd: _vmhd(tree, diagnostic, "moov/trak:0/mdia/minf/vmhd"),
            dinf: _dinf(tree, diagnostic, "moov/trak:0/mdia/minf/dinf"),
            dref: _dref(tree, diagnostic, "moov/trak:0/mdia/minf/dinf/dref"),
//         "url ":_url_(tree, diagnostic, "moov/trak:0/mdia/minf/dinf/dref/url "),
            stbl: _stbl(tree, diagnostic, "moov/trak:0/mdia/minf/stbl"),
            stsd: _stsd(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stsd"),
            avc1: _avc1(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stsd/avc1"),
            avcC: _avcC(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stsd/avc1/avcC"),
            stts: _stts(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stts"),
            stss: _stss(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stss"),
            stsc: _stsc(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stsc"),
            stsz: _stsz(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stsz"),
            stco: _stco(tree, diagnostic, "moov/trak:0/mdia/minf/stbl/stco"),
        };
    }
    var fileBoxes = {
        ftyp: _ftyp(tree, diagnostic, "ftyp"),
        moov: _moov(tree, diagnostic, "moov"),
        mvhd: _mvhd(tree, diagnostic, "moov/mvhd"),
        trak: _trak(tree, diagnostic, "moov/trak"),
        udta: _udta(tree, diagnostic, "moov/udta"),
        meta: _meta(tree, diagnostic, "moov/udta/meta"),
        hdlr: _hdlr(tree, diagnostic, "moov/udta/meta/hdlr"),
        ilst: _ilst(tree, diagnostic, "moov/udta/meta/ilst"),
        free: _free(tree, diagnostic, "free"),
        mdat: _mdat(tree, diagnostic, "mdat"),
    };

    var mp4FileStream =
        _mx(root,
            fileBoxes.ftyp,
            _mx(fileBoxes.moov,
                fileBoxes.mvhd,
                _mx(fileBoxes.trak,
                    videoTrack.tkhd,
                    _mx(videoTrack.edts, videoTrack.elst),
                    _mx(videoTrack.mdia,
                        videoTrack.mdhd,
                        videoTrack.hdlr,
                        _mx(videoTrack.minf,
                            videoTrack.vmhd,
                            _mx(videoTrack.dinf, videoTrack.dref),
                            _mx(videoTrack.stbl,
                                _mx(videoTrack.stsd,
                                    _mx(videoTrack.avc1, videoTrack.avcC)),
                                videoTrack.stts,
                                videoTrack.stss,
                                videoTrack.stsc,
                                videoTrack.stsz,
                                videoTrack.stco)))),
                _mx(fileBoxes.udta,
                    _mx(fileBoxes.meta, fileBoxes.hdlr, fileBoxes.ilst))),
            fileBoxes.free,
            fileBoxes.mdat);

    if (diagnostic) {
        diagnostic["boxes"].sort();
    }

    return { "stream": mp4FileStream, "diagnostic": diagnostic };
}

function _mx(parentBoxView                // @arg MP4BoxClassViewObject|MP4BoxClassFullViewObject
             /*, childrenBoxView... */) { // @var_args MP4BoxClassViewObject|MP4BoxClassFullViewObject
                                          // @ret Uint8Array
                                          // @desc mixin
    var args = arguments;
    // --- get BoxSize ---
    var boxSize    = parentBoxView.source.length;
    var boxType    = parentBoxView.BoxType;
    var boxPath    = parentBoxView.BoxPath;
    var diagnostic = parentBoxView.diagnostic;
    var viewObject = null;
    var childrenBoxTypes = [];

    // --- Write BoxSize include children BoxSize ---
    // parentBoxView.boxSize += childrenBoxViews.boxSize
    for (var i = 1, iz = args.length; i < iz; ++i) {
        viewObject = args[i];
        if (viewObject) {
            childrenBoxTypes.push(viewObject.BoxType + ":" + viewObject.source.length);
            boxSize += viewObject.source.length;
        }
    }
    if (diagnostic) {
        diagnostic["boxes"].push( "root/" + boxPath + ":" + boxSize + " ( " + childrenBoxTypes.join(", ") + " )" );
    }
    // --- copy BoxData to new buffer ---
    var buffer = new Uint8Array(boxSize);
    var cursor = 0;
    for (i = 0; i < iz; ++i) {
        viewObject = args[i];
        if (viewObject) {
            buffer.set(viewObject.source, cursor); // BoxData copy to buffer
            cursor += viewObject.source.length; // move cursor
        }
    }
    if (boxType === "root") {
        return buffer;
    }
    buffer[0] = (boxSize >>> 24) & 0xff;
    buffer[1] = (boxSize >>> 16) & 0xff;
    buffer[2] = (boxSize >>>  8) & 0xff;
    buffer[3] = (boxSize >>>  0) & 0xff;

    return {
        BoxSize:    boxSize,
        BoxType:    boxType, // parent BoxType
        //container:  [],
        cursor:     cursor,
        source:     buffer,
    };
}

function _addDiagnostic(view,         // @arg MP4BoxClassViewObject|MP4BoxClassFullViewObject
                        diagnostic) { // @arg DiagnosticInformationObject
    if (diagnostic && view.BoxSize) {
        diagnostic["boxes"].push( "root/" + view.BoxPath + ":" + view.BoxSize );
        diagnostic["detail"].push({
            "BoxPath": view.BoxPath,
            "BoxType": view.BoxType,
            "BoxSize": view.BoxSize,
        });
    }
    return view;
}

function _createBoxClassView(boxType,      // @arg MP4BoxTypeString - eg: "ftyp"
                             diagnostic,   // @arg Object
                             boxPath) {    // @arg MP4BoxPathString - "root/ftyp"
                                           // @ret MP4BoxClassViewObject - { source, cursor }
                                           // @desc create box class view, without version and flags.
    //
    // ISO/IEC 14496-12 ISO base media file format - 4.2 Object Structure
    //
    //      aligned(8) class Box(unsigned int(32) boxtype,
    //                           optional unsigned int(8)[16] extended_type) {
    //          unsigned int(32) size;
    //          unsigned int(32) type = boxtype;
    //          if (size == 1) {
    //              unsigned int(64) largesize;
    //          } else if (size == 0) {
    //              // box extends to end of file
    //          }
    //          if (boxtype == "uuid") {
    //              unsigned int(8)[16] usertype = extended_type;
    //          }
    //      }
    //
    // > size is an integer that specifies the number of bytes in this box,
    // > including all its fields and contained boxes;
    // > if size is 1 then the actual size is in the field largesize;
    // > if size is 0, then this box is the last one in the file,
    // > and its contents extend to the end of the file (normally only used for a Media Data Box)

    return {
        BoxSize:    0,
        BoxType:    boxType,
        BoxPath:    boxPath,
        cursor:     8,
        source: [
            0x00, // BoxSize(4) reserved
            0x00, // BoxSize(4) reserved
            0x00, // BoxSize(4) reserved
            0x00, // BoxSize(4) reserved
            boxType.charCodeAt(0),
            boxType.charCodeAt(1),
            boxType.charCodeAt(2),
            boxType.charCodeAt(3)
        ],
        diagnostic: diagnostic,
    };
}

function _createFullBoxClassView(boxType,    // @arg MP4BoxTypeString - eg: "ftyp"
                                 diagnostic, // @arg Object
                                 boxPath,    // @arg MP4BoxPathString - "root/ftyp"
                                 version,    // @arg UINT8 = 0
                                 flags) {    // @arg UINT24 = 0
                                             // @ret MP4BoxClassFullViewObject - { source, cursor }
                                             // @desc create box class view, with version and flags.
    //
    // ISO/IEC 14496-12 ISO base media file format - 4.2 Object Structure
    //
    //      aligned(8) class FullBox(unsigned int(32) boxtype,
    //                               unsigned int(8) v,
    //                               bit(24) f) extends Box(boxtype) {
    //          unsigned int(8) version = v;
    //          bit(24) flags = f;
    //      }
    //

    version = version || 0;
    flags   = flags   || 0;

    return {
        BoxSize:    0,
        BoxType:    boxType,
        BoxPath:    boxPath,
        cursor:     12,
        source: [
            0x00, // BoxSize(4) reserved
            0x00, // BoxSize(4) reserved
            0x00, // BoxSize(4) reserved
            0x00, // BoxSize(4) reserved
            boxType.charCodeAt(0),
            boxType.charCodeAt(1),
            boxType.charCodeAt(2),
            boxType.charCodeAt(3),
            (version >>>  0) & 0xff,
            (flags   >>> 16) & 0xff,
            (flags   >>>  8) & 0xff,
            (flags   >>>  0) & 0xff,
        ],
        diagnostic: diagnostic,
    };
}


function _ftyp(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
                           // @ret Object - { BoxType:String, source:Uint8Array, cursor:UINT32 }
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );

    _writeT(view, box["major_brand"], 4);          // "isom"
    _write4(view, box["minor_version"]);           // 512
    _writeT(view, box["compatible_brands"][0], 4); // "isom"
    _writeT(view, box["compatible_brands"][1], 4); // "iso2"
    _writeT(view, box["compatible_brands"][2], 4); // "avc1"
    _writeT(view, box["compatible_brands"][3], 4); // "mp41"
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _moov(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
                           // @ret Object - { BoxType:String, source:Uint8Array, cursor:UINT32 }
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
    return _addDiagnostic(view, diagnostic);
}

function _mdat(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
                           // @ret Object - { BoxType:String, source:Uint8Array, cursor:UINT32 }
    var box     = _findBoxByPath(tree, boxPath);
    var boxSize = 4 + 4 + box["data"].length; // | BoxSize(4) | BoxType(4) | BoxData(n) |
    var boxType = _getLastBoxType(boxPath);
    var view    = {
        BoxSize:    boxSize,
        BoxType:    boxType,
        BoxPath:    boxPath,
        source:     new Uint8Array(boxSize),
        cursor:     0,
    };

    view.source[0] = (boxSize >>> 24) & 0xff;
    view.source[1] = (boxSize >>> 16) & 0xff;
    view.source[2] = (boxSize >>>  8) & 0xff;
    view.source[3] = (boxSize >>>  0) & 0xff;
    view.source[4] = boxType.charCodeAt(0);
    view.source[5] = boxType.charCodeAt(1);
    view.source[6] = boxType.charCodeAt(2);
    view.source[7] = boxType.charCodeAt(3);
    view.source.set(box["data"], 8);
    return _addDiagnostic(view, diagnostic);
}

function _free(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
                           // @ret Object - { BoxType:String, source:Uint8Array, cursor:UINT32 }
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );

        _writeN(view, box["data"], box["data"].length);
        _writeBoxSize(view, view.source.length);
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _mvhd(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
                           // @ret Object - { BoxType:String, source:Uint8Array, cursor:UINT32 }
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] );
    _write4(view, box["creation_time"]);
    _write4(view, box["modification_time"]);
    _write4(view, box["timescale"]);
    _write4(view, box["duration"]);
    _write4(view, box["rate"]);
    _write2(view, box["volume"]);
    _write2(view, 0);               // reserved = 0
    _write4(view, 0);               // reserved = 0
    _write4(view, 0);               // reserved = 0
    _write4(view, box["matrix"][0]);
    _write4(view, box["matrix"][1]);
    _write4(view, box["matrix"][2]);
    _write4(view, box["matrix"][3]);
    _write4(view, box["matrix"][4]);
    _write4(view, box["matrix"][5]);
    _write4(view, box["matrix"][6]);
    _write4(view, box["matrix"][7]);
    _write4(view, box["matrix"][8]);
    _write4(view, 0);               // pre_defined[0]
    _write4(view, 0);               // pre_defined[1]
    _write4(view, 0);               // pre_defined[2]
    _write4(view, 0);               // pre_defined[3]
    _write4(view, 0);               // pre_defined[4]
    _write4(view, 0);               // pre_defined[5]
    _write4(view, box["next_track_ID"]);
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _trak(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
                           // @ret Object - { BoxType:String, source:Uint8Array, cursor:UINT32 }
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
    return _addDiagnostic(view, diagnostic);
}

function _tkhd(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 3
    _write4(view, box["creation_time"]);
    _write4(view, box["modification_time"]);
    _write4(view, box["track_ID"]);
    _write4(view, 0);               // reserved = 0;
    _write4(view, box["duration"]);
    _write4(view, 0);               // reserved = 0;
    _write4(view, 0);               // reserved = 0;
    _write2(view, box["layer"]);
    _write2(view, box["alternate_group"]);
    _write2(view, box["volume"]);
    _write2(view, 0);               // reserved = 0;
    _write4(view, box["matrix"][0]);
    _write4(view, box["matrix"][1]);
    _write4(view, box["matrix"][2]);
    _write4(view, box["matrix"][3]);
    _write4(view, box["matrix"][4]);
    _write4(view, box["matrix"][5]);
    _write4(view, box["matrix"][6]);
    _write4(view, box["matrix"][7]);
    _write4(view, box["matrix"][8]);
    _write4(view, box["width"]);
    _write4(view, box["height"]);
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _edts(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _elst(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] );

    _write4(view, box["entry_count"]);

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        var entries = box["entries"][i];

        _write4(view, entries["segment_duration"]);
        _write4(view, entries["media_time"]);
        _write2(view, entries["media_rate_integer"]);
        _write2(view, entries["media_rate_fraction"]);
    }
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _mdia(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
    return _addDiagnostic(view, diagnostic);
}

function _mdhd(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] );
    _write4(view, box["creation_time"]);
    _write4(view, box["modification_time"]);
    _write4(view, box["timescale"]);
    _write4(view, box["duration"]);
    _write2(view, (box["language"].charCodeAt(0) - 0x60) << 10 |
                  (box["language"].charCodeAt(1) - 0x60) <<  5 |
                  (box["language"].charCodeAt(2) - 0x60));
    _write2(view, 0); // pre_defined
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _hdlr(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString - "moov/trak:0/mdia/hdlr" or "moov/udta/meta/hdlr"
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] );
    _write4(view, 0);                               // pre_defined = 0
    _write4(view, box["handler_type"]);             // mdia/hdlr.handler_type = 1986618469 = 0x76696465 = "vide"
                                                    // meta/hdlr.handler_type = 1835297138 = 0x6d646972 = "mdir"
    _write4(view, box["handler_type2"]);            // mdia/hdlr.handler_type2 = 0
                                                    // meta/hdlr.handler_type2 = 1634758764 = 0x6d646972 = "appl"
    _write4(view, 0);                               // reserved = 0
    _write4(view, 0);                               // reserved = 0
    _writeT(view, box["name"], box["name"].length);
    _write1(view, 0x00);                            // add null-terminate
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _minf(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
    return _addDiagnostic(view, diagnostic);
}

function _vmhd(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                            box["version"], box["flags"] ); // 0, 1 (flags always 1)
        _write2(view, box["graphicsmode"]);
        _write2(view, box["opcolor"][0]);
        _write2(view, box["opcolor"][1]);
        _write2(view, box["opcolor"][2]);
        _writeBoxSize(view, view.source.length);
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _dinf(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
    return _addDiagnostic(view, diagnostic);
}

/*
function _dref(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 0
    _write4(view, box["entry_count"]); // always 0x00000001
    var containerLength = 0;

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        var urlView = _url_(tree, diagnostic, boxPath + "/url :" + i); // "moov/trak:0/mdia/minf/dinf/dref/url :0"

        view.container.push( urlView );
        view.cursor += urlView.BoxSize;
    }
    _writeBoxSize(view, view.cursor);
    return _addDiagnostic(view, diagnostic);
}

function _url_(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( "url ", diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 0x000000 or 0x000001
    var url  = box["url"];

    if (url.length) { // workaround. 長さゼロなら null を出力しない
        for (var i = 0, jz = url.length; i < jz; ++i) {
            _write1(view, url.charCodeAt(i));
        }
        _write1(view, 0); // add null-terminater
    }
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}
 */

function _dref(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var view = {
        BoxSize:    28,
        BoxType:    "dref",
        BoxPath:    boxPath,
        cursor:     28,
        source: [
            0x00, 0x00, 0x00, 0x1C, // BoxSize 28
            0x64, 0x72, 0x65, 0x66, // BoxType "dref"
            0x00,                   // unsigned int(8)  version
            0x00, 0x00, 0x00,       // unsigned int(24) flags
            0x00, 0x00, 0x00, 0x01, // unsigned int(32) entry_count
            0x00, 0x00, 0x00, 0x0C, // BoxSize 12
            0x75, 0x72, 0x6C, 0x20, // BoxType "url "
            0x00,                   // unsigned int(8)  version
            0x00, 0x00, 0x01,       // unsigned int(24) flags = 0x000000 or 0x000001
        ],
        diagnostic: diagnostic,
    };
    return _addDiagnostic(view, diagnostic);
}

function _stbl(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
    return _addDiagnostic(view, diagnostic);
}

function _stsd(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 0
    _write4(view, box["entry_count"]);
    return _addDiagnostic(view, diagnostic);
}

function _stts(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 0
    _write4(view, box["entry_count"]);

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        _write4(view, box["samples"][i]["sample_count"]);
        _write4(view, box["samples"][i]["sample_delta"]);
    }
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _stss(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                            box["version"], box["flags"] ); // 0, 0
        _write4(view, box["entry_count"]);

        for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
            _write4(view, box["samples"][i]["sample_number"]);
        }
        _writeBoxSize(view, view.source.length);
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _stsc(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 0

    _write4(view, box["entry_count"]);

    for (var i = 0, iz = box["entry_count"]; i < iz; ++i) {
        _write4(view, box["samples"][i]["first_chunk"]);
        _write4(view, box["samples"][i]["samples_per_chunk"]);
        _write4(view, box["samples"][i]["sample_description_index"]);
    }
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _stsz(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                            box["version"], box["flags"] ); // 0, 0
        _write4(view, box["sample_size"]);
        _write4(view, box["sample_count"]);

        if (box["sample_size"] === 0) {
            for (var i = 0, iz = box["sample_count"]; i < iz; ++i) {
                _write4(view, box["samples"][i]["entry_size"]);
            }
        }
        _writeBoxSize(view, view.source.length);
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _stco(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                        box["version"], box["flags"] ); // 0, 0
    var entry_count = box["entry_count"];

    _write4(view, entry_count);

    for (var i = 0, iz = entry_count; i < iz; ++i) {
        _write4(view, box["samples"][i]["chunk_offset"]);
    }
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

function _udta(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    // "moov.udta" or "trak.udta"
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _meta(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    //  "moov.meta" or "trak.meta" or "meco.meta" or "moov.udta.meta"
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createFullBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath,
                                            box["version"], box["flags"] );  // 0, 0
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _ilst(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box = _findBoxByPath(tree, boxPath);
    if (box) {
        var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );

        _writeN(view, box["data"], box["data"].length);
        _writeBoxSize(view, view.source.length);
        return _addDiagnostic(view, diagnostic);
    }
    return null;
}

function _avc1(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );

    _write4(view, 0);                   // reserved = 0
    _write2(view, 0);                   // reserved = 0
    _write2(view, box["data_reference_index"]);
    _write2(view, 0);                   // pre_defined = 0
    _write2(view, 0);                   // reserved = 0
    _write4(view, 0);                   // pre_defined[0] = 0
    _write4(view, 0);                   // pre_defined[1] = 0
    _write4(view, 0);                   // pre_defined[2] = 0
    _write2(view, box["width"]);
    _write2(view, box["height"]);
    _write4(view, box["horizresolution"]);
    _write4(view, box["vertresolution"]);
    _write4(view, 0);                   // reserved
    _write2(view, box["frame_count"]);
    _writeT(view, box["compressorname"], 32);
    _write2(view, box["depth"]);
    _write2(view, 0xFFFF);              // pre_defined = -1

    return _addDiagnostic(view, diagnostic);
}

function _avcC(tree,       // @arg MP4BoxTreeObject
               diagnostic, // @arg Object
               boxPath) {  // @arg MP4BoxPathString
    var box  = _findBoxByPath(tree, boxPath);
    var view = _createBoxClassView( _getLastBoxType(boxPath), diagnostic, boxPath );

    // AVCDecoderConfigurationRecord
    _write1(view, box["configurationVersion"]);    // = 1
    _write1(view, box["AVCProfileIndication"]);    // = 66 (Baseline profile)
    _write1(view, box["profile_compatibility"]);   // = 192
    _write1(view, box["AVCLevelIndication"]);      // = 30 (Level 3.0)
    _write1(view, 0xFC | (box["lengthSizeMinusOne"] & 0x3));          // `111111` + lengthSizeMinusOne
    _write1(view, 0xE0 | (box["numOfSequenceParameterSets"] & 0x1F)); // `111`    + numOfSequenceParameterSets

    var sps, pps, length, nalUnit;

    var i = 0, iz = box["numOfSequenceParameterSets"] & 0x1F;
    for (; i < iz; ++i) {
        sps     = box["SPS"][i];
        length  = sps["sequenceParameterSetLength"];
        nalUnit = sps["sequenceParameterSetNALUnit"];

        _write2(view, length);
        _writeN(view, nalUnit);
    }
    iz = box["numOfPictureParameterSets"];
    _write1(view, iz);
    for (i = 0; i < iz; ++i) {
        pps     = box["PPS"][i];
        length  = pps["pictureParameterSetLength"];
        nalUnit = pps["pictureParameterSetNALUnit"];

        _write2(view, length);
        _writeN(view, nalUnit);
    }
    _writeBoxSize(view, view.source.length);
    return _addDiagnostic(view, diagnostic);
}

// =========================================================
function _getLastBoxType(boxPath) { // @arg MP4BoxPathString - "moov/mvhd"
                                    // @ret MP4BoxTypeString - "mvhd"
                                    // @desc get last BoxType in path.
    if (boxPath.indexOf("/") < 0) {
        return boxPath;
    }
    var tokenArray = boxPath.split("/");

    return tokenArray[ tokenArray.length - 1 ];
}

function _findBoxByPath(tree,      // @arg MP4BoxTreeObject - { root: { ftyp, moov: {...}, free, mdat } }
                        boxPath) { // @arg MP4BoxPathString - eg: "moov/trak:0/mdia/minf"
                                   // @ret MP4BoxObject|null - { property... }
    var boxObject = tree["root"];
    var pathArray = boxPath.split("/"); // "moov/trak:0/mdia/minf" -> ["moov", "trak:0", "mdia", "minf"]

    for (var i = 0, iz = pathArray.length; boxObject && i < iz; ++i) {
        var boxType = pathArray[i]; // "moov" / "trak:0" / "mdia" / "minf"

        if (_hasTrackNumber(boxType)) {
            var tokenArray = boxType.split(":"); // "trak:0" -> ["trak", 0]

            boxObject = boxObject[ tokenArray[0] ][ tokenArray[1] ] || null; // get track
        } else {
            boxObject = boxObject[ boxType ] || null; // get object
        }
    }
    return boxObject;

    function _hasTrackNumber(boxType) { // @arg MP4BoxTypeString
                                        // @ret Boolean
        return boxType.indexOf(":") >= 0; // "trak:0" -> true
    }
}


function _writeBoxSize(view,      // @arg MP4BoxClassViewObject|MP4BoxClassFullViewObject
                       boxSize) { // @arg UINT32
                                  // @ret Uint8Array|Array
    view.BoxSize = boxSize;
    view.source[0] = (boxSize >>> 24) & 0xff;
    view.source[1] = (boxSize >>> 16) & 0xff;
    view.source[2] = (boxSize >>>  8) & 0xff;
    view.source[3] = (boxSize >>>  0) & 0xff;
    return view;
}

function _writeT(view,   // @arg Object - { source, cursor }
                 text,   // @arg String
                 size) { // @arg UINT8
                         // @ret Object - { source, cursor }
                         // @desc write text
    for (var i = 0, iz = size; i < iz; ++i) {
        view.source[view.cursor++] = text.charCodeAt(i);
    }
    return view;
}

function _writeN(view,     // @arg Object - { source, cursor }
                 buffer) { // @arg TypedArray|Array
    if (Array.isArray(view.source)) {
        if (Array.isArray(buffer)) {
            view.source = [].concat(view.source, buffer);
        } else {
            view.source = [].concat(view.source, Array.prototype.slice.call(buffer));
        }
    } else {
        view.source.set(buffer, view.cursor);
    }
    view.cursor += buffer.length;
}

function _write4(view,    // @arg Object - { source, cursor }
                 value) { // @arg UINT32
                          // @ret Object - { source, cursor }
    view.source[view.cursor++] = (value >>> 24) & 0xff;
    view.source[view.cursor++] = (value >>> 16) & 0xff;
    view.source[view.cursor++] = (value >>>  8) & 0xff;
    view.source[view.cursor++] = (value >>>  0) & 0xff;
    return view;
}

//function _write3(view,    // @arg Object - { source, cursor }
//                 value) { // @arg UINT32
//                          // @ret Object - { source, cursor }
//    view.source[view.cursor++] = (value >>> 16) & 0xff;
//    view.source[view.cursor++] = (value >>>  8) & 0xff;
//    view.source[view.cursor++] = (value >>>  0) & 0xff;
//    return view;
//}

function _write2(view,    // @arg Object - { source, cursor }
                 value) { // @arg UINT16
                          // @ret Object - { source, cursor }
    view.source[view.cursor++] = (value >>>  8) & 0xff;
    view.source[view.cursor++] = (value >>>  0) & 0xff;
    return view;
}

function _write1(view,    // @arg Object - { source, cursor }
                 value) { // @arg UINT8
                          // @ret Object - { source, cursor }
    view.source[view.cursor++] = (value >>>  0) & 0xff;
    return view;
}

return MP4Builder; // return entity

});

