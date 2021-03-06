(function(window, angular){
    'use strict';

    angular.module('gallery', []).directive('ptGalleryItem', function() {
        return {
            scope: {
                'itemid': '=ptGalleryItemId',
                'item': '=ptGalleryItem',
                'itemidx': '=ptGalleryItemIndex'
            },
            link: function($scope, element, attrs) {
                var scope = $scope.$parent,
                    containerScope = scope.$parent;

                scope.$$element = element;

                scope.$expanded = containerScope.$expandedId == $scope.itemid;
                scope.$showdetails = containerScope.$showdetailsId == $scope.itemid;

                if(scope.$expanded) {
                    containerScope.$expandedScope = scope;
                }

                if(scope.$showdetails) {
                    containerScope.detailScope = scope;
                }

                scope.$toggle = function() {
                    if(scope.$showdetails) {
                        if(containerScope.$expandedScope)
                            containerScope.$expandedScope.$expanded = false;
                        containerScope.$expandedScope = null;
                        containerScope.$detailScope = null;
                        containerScope.$showdetailsId = null;
                        containerScope.$showdetailsIdx = null;
                        containerScope.$expandedId = null;
                        containerScope.$expandedItem = null;
                        scope.$showdetails = false;
                    } else {
                        var switchExpand = true;
                        if(containerScope.$expandedScope) {
                            var prevEl = containerScope.$expandedScope.$$element;
                            switchExpand = (prevEl.offset().top != element.offset().top);
                            if(switchExpand) containerScope.$expandedScope.$expanded = false;
                        }
                        if(switchExpand) {
                            scope.$expanded = true;
                            containerScope.$expandedScope = scope;
                        }
                        if(containerScope.$detailScope) {
                            containerScope.$detailScope.$showdetails = false;
                        }
                        scope.$showdetails = true;
                        containerScope.$detailScope = scope;
                    }

                    if(scope.$showdetails) {
                        containerScope.$showdetailsId = $scope.itemid;
                        containerScope.$showdetailsIdx = $scope.itemidx;
                        containerScope.$expandedItem = $scope.item;
                    }
                    if(scope.$expanded) {
                        containerScope.$expandedId = $scope.itemid;
                        containerScope.$emit('vsItemExpanded');
                    }

                    containerScope.animateFill = true;
                };
            }
        };
    });

})(window, window.angular);