/// <reference path="../../scripts/typings/signalr/images.d.ts" />
/// <reference path="../../scripts/typings/bootstrap/bootstrap.d.ts" />
/// <reference path="../../scripts/typings/knockout.mapping/knockout.mapping.d.ts" />
/// <reference path="../models/image.ts" />
define(["require", "exports", 'plugins/router', 'plugins/http'], function (require, exports, router, http) {
    var HomeViewModel = (function () {
        function HomeViewModel() {
            var that = this;
            that.router = router;
            that.pages = ko.observableArray([]);
            that.currentPage = ko.observable(1);
            that.images = ko.observableArray([]);
            that.imageCount = ko.observable(0);
            that.dropzoneLoaded = ko.observable(false);
            that.loading = ko.observable(true);
        }
        HomeViewModel.prototype.activate = function () {
            var that = this;
            $.connection.hub.logging = true;
            that.imageHub = $.connection.imagesHub;
            that.imageHub.client.ping = function () {
                console.log(new Date().toJSON());
            };
            that.imageHub.client.imageUploaded = function () {
                console.log("Server requesting refresh of images");
                that.getImages(0);
            };
            that.imageHub.client.disconnected = function () {
                setTimeout(function () {
                    $.connection.hub.start();
                }, 5000); // Restart connection after 5 seconds.
            };
            return $.connection.hub.start().done(function () {
                return http.get("/api/images/list/count").done(function (response) {
                    if (response.imageCount < 1)
                        response.imageCount = 1;
                    var pages = Math.floor(response.imageCount / 12);
                    if (pages < 1)
                        pages = 1;
                    var pageArray = [];
                    for (var i = 1; i <= pages; i++) {
                        pageArray.push(i);
                    }
                    that.pages(pageArray);
                    that.imageCount(response.imageCount);
                    return that.getImages(0);
                });
            });
        };
        HomeViewModel.prototype.compositionComplete = function () {
            var that = this;
            $('#image-upload').on('shown.bs.modal', function () {
                $("#image-container").empty();
                if (that.dropzoneLoaded())
                    return;
                that.dropzoneLoaded(true);
            });
            setTimeout(function () {
                that.imageHub.server.informClientsOfNewImage();
            }, 5000); // Restart connection after 5 seconds.
        };
        HomeViewModel.prototype.fileLoaded = function (file, data) {
            var that = this;
            // add preview
            var img = $(document.createElement("img"));
            img.attr("src", data);
            img.addClass("preview");
            $("#image-container").append(img);
            // Start upload
            var reader = new FileReader();
            reader.onloadend = that.imageLoaded(file);
            reader.readAsArrayBuffer(file);
        };
        HomeViewModel.prototype.imageLoaded = function (file) {
            var that = this;
            return (function (theFile) { return function (e) {
                $.get("/api/images/upload/url").done(function (url) {
                    that.uploadImage(url, file.type, e.target.result);
                });
            }; })(file);
        };
        HomeViewModel.prototype.uploadImage = function (url, contentType, data) {
            var that = this;
            var ajaxRequest = new XMLHttpRequest();
            try {
                ajaxRequest.open('PUT', url, true);
                ajaxRequest.setRequestHeader('Content-Type', contentType);
                ajaxRequest.setRequestHeader('x-ms-blob-type', 'BlockBlob');
                ajaxRequest.send(data);
                that.reportImageUploaded(contentType, url);
            }
            catch (e) {
                alert("can't upload the image to server.\n" + e.toString());
            }
        };
        HomeViewModel.prototype.reportImageUploaded = function (contentType, url) {
            var that = this;
            var uri = "/api/images/upload/complete";
            var bag = {
                storageUrl: url,
                contentType: contentType
            };
            $.ajax(uri, {
                data: bag,
                dataType: "json",
                type: "post"
            }).done(function () {
                $("#image-container").append("<br /><br />Done");
                $("#image-upload").modal('hide');
                that.getImages(0);
            });
        };
        HomeViewModel.prototype.getImages = function (offset) {
            var that = this;
            that.loading(true);
            that.images([]);
            return http.get("/api/images/list/12/" + offset).done(function (response) {
                var images = ko.mapping.fromJS(response);
                that.images(images());
            });
        };
        HomeViewModel.prototype.updateImage = function (img) {
            $("#image-gallery-title").text(img.title());
            $("#image-gallery-image").attr("src", img.source());
            $("#image-gallery-link").attr("href", img.source());
        };
        HomeViewModel.prototype.gotoPrevious = function () {
            var that = this;
            that.gotoPage(that.currentPage() - 1);
        };
        HomeViewModel.prototype.gotoNext = function () {
            var that = this;
            that.gotoPage(that.currentPage() + 1);
        };
        HomeViewModel.prototype.gotoPage = function (index) {
            var that = this;
            if (index === that.currentPage())
                return;
            if (index > that.pages().length)
                index = that.pages().length;
            that.currentPage(index);
            that.getImages(index * 12);
        };
        HomeViewModel.prototype.deleteImage = function (image) {
            var that = this;
            that.loading(true);
            var url = "/api/images/delete";
            var bag = {
                imageId: image.id()
            };
            http.post(url, bag).always(function () {
                that.getImages(0);
            });
        };
        return HomeViewModel;
    })();
    return HomeViewModel;
});
//# sourceMappingURL=home.js.map