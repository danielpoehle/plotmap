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
        bVEList.visual = [];
        bVEList.loadComplete = false;
        bVEList.mapString = '';
        bVEList.nord = false;
        bVEList.ost = false;
        bVEList.suedost = false;
        bVEList.mitte = true;
        bVEList.west = false;
        bVEList.suedwest = false;
        bVEList.sued = false;
        bVEList.A = true;
        bVEList.B = true;
        bVEList.C = false;
        bVEList.F = true;
        
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
                console.log(bVEList.bVE[0]);
            };
        };
        
        bVEList.addToList = function(){
            const id = $('#add').attr('value');
            console.log(id);
        };

        bVEList.filterAndShowbVE = function(){            
            let region = [];
            if(bVEList.nord) {region.push("NORD");}
            if(bVEList.ost) {region.push("OST");}
            if(bVEList.suedost) {region.push("SÜDOST");}
            if(bVEList.mitte) {region.push("MITTE");}
            if(bVEList.west) {region.push("WEST");}
            if(bVEList.suedwest) {region.push("SÜDWEST");}
            if(bVEList.sued) {region.push("SÜD");}
            let mn = [];
            if(bVEList.A){mn.push("A");}
            if(bVEList.B){mn.push("B");}
            if(bVEList.C){mn.push("C");}
            if(bVEList.F){mn.push("F");}
            bVEList.mapString = PlotService.generateMapString(bVEList.selecteDate, bVEList.bVE, region, mn);
            var mapBBcode = new MapBBCode({
                windowPath: './mapbbcode/',
                layers: 'RailwayMap',
                defaultPosition: [22, 11],
                viewWidth: 1280,
                viewHeight: 600,
                fullViewHeight: 600,
                allowedHTML: 'span|i|h6|br|input|li|ul|p|button',
                fullFromStart: false,
                fullViewHeight: -1, 
                defaultZoom: 8
            });
            mapBBcode.show('railmap', bVEList.mapString);
        };
    }

    function PlotService(){
        let service = this;
        
        service.createPin = function(lat, lon, bVE){
            //53.5136232,8.0525981(<h6>Mariensiel</h6>)
            let pin = lat + ',' + lon + '(<h6>' + bVE.WORK + '</h6>';
            if(bVE.BTS.length === 1){
                pin += '<p>Bahnhof: ' + bVE.BTS[0].name.replace(')', "\\)") + '</p>';
            }else{
                pin += '<p>Abschnitt: ' + bVE.BTS[0].name.replace(')', "\\)") + ' - ' + bVE.BTS[1].name.replace(')', "\\)") + '</p>';
            }
            pin += '<ul id="add" value=' + bVE.BVEID + '><li>DS100: ' + bVE.BTS[0].ds100 + '</li><li>' + bVE.KAT + '-Maßnahme' + '</li><li>Beginn ' + bVE.G_START + '</li>';
            pin += '<li>Ende ' + bVE.G_END + '</li></ul> ';
            pin += '<p data-toggle="tooltip" data-placement="top" title="'+ bVE.NOTE.replaceAll(')', "\\)") + '">Notizen <i class="fas fa-info-circle"></i></p>) ';
            return pin;
        };

        service.generateMapString = function(selectedDate, bVEList, regionen, massnahmen){
            const DateTime = luxon.DateTime;
            const Interval = luxon.Interval;
            const beginDay = DateTime.fromFormat(selectedDate, 'dd.MM.yyyy');
            const endDay = beginDay.plus({ days: 1 }).minus({seconds: 1});
            const selectedDayInterval = Interval.fromDateTimes(beginDay, endDay);
            const filteredbVEList = bVEList.filter((b) => regionen.includes(b.REGION) && selectedDayInterval.overlaps(
                Interval.fromDateTimes(DateTime.fromMillis(b.START), DateTime.fromMillis(b.END))) && massnahmen.includes(b.KAT));

            let allStations = filteredbVEList.map((f) => f.BTS[0].ds100);
            allStations = allStations.filter((item, index) => allStations.indexOf(item)===index);

            let pinString = '[map] ';

            for (let n = 0; n < allStations.length; n += 1) {
                const bveBf = filteredbVEList.filter((f) => f.BTS[0].ds100 === allStations[n]);                
                if(bveBf.length === 1){                    
                    pinString += service.createPin(bveBf[0].BTS[0].lat, bveBf[0].BTS[0].lon, bveBf[0]);
                }else{                    
                    const alphaStp = 2 * Math.PI / bveBf.length;
                    let radius = 0.0002;
                    if(bveBf.length > 4){radius = 0.0003;}
                    for (let j = 0; j < bveBf.length; j += 1) {
                        pinString += service.createPin(parseFloat(bveBf[j].BTS[0].lat) + radius * Math.sin(j*alphaStp), 
                                                       parseFloat(bveBf[j].BTS[0].lon) + radius * Math.cos(j*alphaStp), 
                                                       bveBf[j]);                        
                    }
                }                
            };
            //console.log(pinString);
            pinString += ' [/map]';
            return pinString;
        };
    }
})();
