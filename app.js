(function () {
    'use strict'; //browser does complain about bad coding

    angular.module('PlotMap', [])
    .controller('PlotController', PlotController)
    .service('PlotService', PlotService);
    
    PlotController.$inject = ['PlotService'];
    function PlotController(PlotService) {
        let bVEList = this;
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        
        bVEList.Filename = '';
        bVEList.selecteDate = new Date().toLocaleDateString('de-DE', options);
        bVEList.bVE = [];
        bVEList.loadComplete = false;
        bVEList.mapString = '';
        bVEList.nord = false;
        bVEList.ost = false;
        bVEList.suedost = false;
        bVEList.mitte = true;
        bVEList.west = false;
        bVEList.suedwest = false;
        bVEList.sued = false;
        
        $(document).ready(function () {
            $('#list').bind('change', handleDialog);
        });
        
        function handleDialog(event) {
            const { files } = event.target;
            const file = files[0];
            
            const reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function (event) {
                bVEList.bVE = JSON.parse(event.target.result);
                bVEList.loadComplete = true;
                //console.log(bVEList.bVE[0]);
            };
        }

        bVEList.filterAndShowbVE = function(){
            let region = [];
            if(bVEList.nord) {region.push("NORD");}
            if(bVEList.ost) {region.push("OST");}
            if(bVEList.suedost) {region.push("SÜDOST");}
            if(bVEList.mitte) {region.push("MITTE");}
            if(bVEList.west) {region.push("WEST");}
            if(bVEList.suedwest) {region.push("SÜDWEST");}
            if(bVEList.sued) {region.push("SÜD");}
            bVEList.mapString = PlotService.generateMapString(bVEList.selecteDate, bVEList.bVE, region);
            var mapBBcode = new MapBBCode({
                windowPath: './mapbbcode/',
                layers: 'RailwayMap',
                defaultPosition: [22, 11],
                viewWidth: 1280,
                viewHeight: 650,
                fullViewHeight: 600,
                allowedHTML: 'span|i|h6|br|input|li|ul|p',
                fullFromStart: false,
                fullViewHeight: -1, 
                defaultZoom: 8
            });
            mapBBcode.show('railmap', bVEList.mapString);
        };
    }

    function PlotService(){
        let service = this;
        
        service.createPin = function(bVE){
            //53.5136232,8.0525981(<h6>Mariensiel</h6>)
            let pin = bVE.BTS[0].lat + ',' + bVE.BTS[0].lon + '(<h6>' + bVE.WORK + '</h6>';
            if(bVE.BTS.length === 1){
                pin += '<p>Bahnhof: ' + bVE.BTS[0].name.replace(')', "\\)") + '</p>';
            }else{
                pin += '<p>Abschnitt: ' + bVE.BTS[0].name.replace(')', "\\)") + ' - ' + bVE.BTS[1].name.replace(')', "\\)") + '</p>';
            }
            pin += '<ul><li>' + bVE.KAT + '-Maßnahme' + '</li><li>Beginn ' + bVE.G_START + '</li>';
            pin += '<li>Ende ' + bVE.G_END + '</li></ul>) ';
            return pin;
        };

        service.generateMapString = function(selectedDate, bVEList, regionen){
            const DateTime = luxon.DateTime;
            const Interval = luxon.Interval;
            const beginDay = DateTime.fromFormat(selectedDate, 'dd.MM.yyyy');
            const endDay = beginDay.plus({ days: 1 }).minus({seconds: 1});
            const selectedDayInterval = Interval.fromDateTimes(beginDay, endDay);
            const filteredbVEList = bVEList.filter((b) => regionen.includes(b.REGION) && selectedDayInterval.overlaps(
                Interval.fromDateTimes(DateTime.fromMillis(b.START), DateTime.fromMillis(b.END)
            )));
            let pinString = '[map] ';
            filteredbVEList.forEach((b, i) => {
                pinString += service.createPin(b);
            });
            //console.log(pinString);
            pinString += ' [/map]';
            return pinString;
        };
    }
})();
