var ModuleTestMP4Builder = (function(global) {

var test = new Test(["MP4Builder"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     false, // enable worker test.
        node:       false, // enable node test.
        nw:         true,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     true,  // show button.
        both:       false,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

if (IN_BROWSER || IN_NW || IN_EL) {
    test.add([
        testMP4Builder_buildMP4,
        //testMP4Builder_build2,
    ]);
}

// --- test cases ------------------------------------------
function testMP4Builder_buildMP4(test, pass, miss) {
    //  MP4.build(MP4.parse("ff/png.00.mp4")) が Finder 上で再生できる事を確認する

    var mp4File  = "../assets/ff/png.00.mp4";
    var saveFile = "../assets/js/png.00.mp4";

    FileLoader.toArrayBuffer(mp4File, function(buffer) {
        console.log("testMP4Builder_buildMP4: ", mp4File, buffer.byteLength);

        MP4Parser.VERBOSE = false
        // phase 1
        var originalStream = new Uint8Array(buffer);
        var mp4BoxTree1    = MP4Parser.parse(originalStream);
        var mp4FileStream1 = MP4Builder.build(mp4BoxTree1, { fastStart: true, diagnostic: true });

        //require("fs").writeFileSync("../a.mp4", new Buffer(stream), "binary");
        //require("fs").writeFileSync("../b.mp4", new Buffer(stream), "binary");

        // cmp -b -l a.mp4 assets/ff/png.00.mp4 で生成したファイルのdiffを取得し確認する
        // phase 2
        var mp4BoxTree2    = MP4Parser.parse(mp4FileStream1.stream);
        var mp4FileStream2 = MP4Builder.build(mp4BoxTree2, { fastStart: true, diagnostic: true });

        //require("fs").writeFileSync(saveFile, new Buffer(mp4FileStream2.stream.buffer), "binary");

        // Finder で確認
        if ( _binaryCompare(mp4FileStream1.stream, mp4FileStream2.stream) ) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function(error) {
        debugger;
        console.error(error.message);
        test.done(miss());
    });
}

function _binaryCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (var i = 0, iz = a.length; i < iz; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

return test.run();

})(GLOBAL);

