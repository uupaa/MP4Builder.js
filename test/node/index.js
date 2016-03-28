// MP4Builder test

require("../../lib/WebModule.js");

WebModule.VERIFY  = true;
WebModule.VERBOSE = true;
WebModule.PUBLISH = true;

require("../../node_modules/uupaa.task.js/lib/Task.js");
require("../../node_modules/uupaa.task.js/lib/TaskMap.js");
require("../../node_modules/uupaa.fileloader.js/lib/FileLoader.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.hexdump.js/lib/HexDump.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/node_modules/uupaa.bit.js/lib/Bit.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/node_modules/uupaa.bit.js/lib/BitView.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitType.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitParameterSet.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitEBSP.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitAUD.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitSPS.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitPPS.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitSEI.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitIDR.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnit.js");
require("../../node_modules/uupaa.h264.js/lib/H264.js");
require("../../node_modules/uupaa.typedarray.js/lib/TypedArray.js");
require("../../node_modules/uupaa.mp4parser.js/lib/MP4Parser.js");
require("../wmtools.js");
require("../../lib/MP4Builder.js");
require("../../release/MP4Builder.n.min.js");
require("../testcase.js");

