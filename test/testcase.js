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
    ]);
}

// --- test cases ------------------------------------------
function testMP4Builder_buildMP4(test, pass, miss) {
    //  ff/png.all.mp4 を parse -> build -> parse -> build した結果、元と同じファイルが生成される事を確認する

    var mp4File  = "../assets/ff/png.all.mp4";
    var saveFile = "../assets/js/png.all.mp4";

    FileLoader.toArrayBuffer(mp4File, function(buffer) {
        console.log("testMP4Builder_buildMP4: ", mp4File, buffer.byteLength);

        MP4Parser.VERBOSE = false

        var mp4tree1 = MP4Parser.parse( new Uint8Array(buffer) );
debugger;
        var mp4file1 = MP4Builder.build(mp4tree1, { fastStart: true, diagnostic: true }); // { stream, diagnostic }
        var mp4tree2 = MP4Parser.parse(mp4file1.stream);
        var mp4file2 = MP4Builder.build(mp4tree2, { fastStart: true, diagnostic: true });

        if (IN_EL) {
            //
            // 目視確認用(Electronのみ)
            //
            // $ npm run el
            // $ npm run bin_diff
            //
            // または
            //
            // cmp -b -l test/assets/ff/png.all.mp4 test/assets/js/png.all.mp4
            //
            require("fs").writeFileSync(saveFile, new Buffer(mp4file2.stream.buffer), "binary");
            console.log("put file: " + saveFile);
        }

        if ( _binaryCompare(mp4file1.stream, mp4file2.stream) ) {
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

