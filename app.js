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
        bVEList.toDate = bVEList.selecteDate;
        bVEList.bVE = [];
        bVEList.selectedbVE = [];
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
        bVEList.showSelbVETable = false;
        
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
                for( let j = 0; j < bVEList.bVE.length; j+= 1 ) {
                    bVEList.bVE[j].weekdays = transformVTStoWeekdays(bVEList.bVE[j].VTS);                    
                }
                console.log(bVEList.bVE.find((b)=> b.VTS === "12000" && b.REGION === "MITTE"));
                // console.log(bVEList.bVE[0]);
            };
        };
        
        bVEList.addToList = function(){
            const id = $('#add').attr('value');            
            const selbVE = bVEList.bVE.filter((b) => b.BVEID === id);
            //console.log(selbVE);
            const ds100 = selbVE[0].BTS[0].ds100
            if(bVEList.selectedbVE.findIndex((s) => s.ds100 === ds100) === -1){
                bVEList.selectedbVE.push({ds100: ds100, bveList: [selbVE[0]], name: selbVE[0].BTS[0].name});
            }else{

                if(!bVEList.selectedbVE.find((s) => s.ds100 === ds100).bveList.map((m) => m.BVEID).includes(id)){
                    bVEList.selectedbVE.find((s) => s.ds100 === ds100).bveList.push(selbVE[0]);
                }                
            }
            if(bVEList.selectedbVE.length > 0){bVEList.showSelbVETable = true;}
            //console.log(bVEList.selectedbVE);
        };

        bVEList.filterAndShowbVE = function(){  
            bVEList.showSelbVETable = false;
            bVEList.selectedbVE = [];                      
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
            bVEList.mapString = PlotService.generateMapString(bVEList.selecteDate, bVEList.toDate, bVEList.bVE, region, mn);
            var mapBBcode = new MapBBCode({
                windowPath: './mapbbcode/',
                layers: 'RailwayMap',
                defaultPosition: [22, 11],
                viewWidth: 1500,
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
            pin += '<p>BOB-Vorgangsnummer ' + bVE.BOB + '</p>';
            if(bVE.BTS.length === 1){
                pin += '<p>Bahnhof: ' + bVE.BTS[0].name.replaceAll(')', "\\)") + '</p>';
            }else{
                pin += '<p>Abschnitt: ' + bVE.BTS[0].name.replaceAll(')', "\\)") + ' - ' + bVE.BTS[1].name.replaceAll(')', "\\)") + '</p>';
            }
            pin += '<ul id="add" value=' + bVE.BVEID + '><li>DS100: ' + bVE.BTS[0].ds100 + '</li><li>' + bVE.KAT + '-Maßnahme' + '</li><li>Beginn ' + bVE.G_START + '</li>';
            pin += '<li>Ende ' + bVE.G_END + '</li><li>Schichtweise ' + bVE.SCHICHT + '</li><li> ' + bVE.LIMITATION + '</li><li>' + bVE.RULE + '</li></ul> ';
            pin += '<p data-toggle="tooltip" data-placement="top" title="'+ bVE.NOTE.replaceAll(')', "\\)") + '">Notizen <i class="fas fa-info-circle"></i></p>) ';
            return pin;
        };

        service.generateMapString = function(selectedDate, toDate, bVEList, regionen, massnahmen){
            const DateTime = luxon.DateTime;
            const Interval = luxon.Interval;
            const beginDay = DateTime.fromFormat(selectedDate, 'dd.MM.yyyy');
            const endDay = DateTime.fromFormat(toDate, 'dd.MM.yyyy').plus({ days: 1 }).minus({seconds: 1});
            const selectedDayInterval = Interval.fromDateTimes(beginDay, endDay);
            const filteredbVEList = bVEList.filter((b) => regionen.includes(b.REGION) && selectedDayInterval.overlaps(
                Interval.fromDateTimes(DateTime.fromMillis(b.START), DateTime.fromMillis(b.END))) && massnahmen.includes(b.KAT) && checkWeekdays(b.VTS, selectedDayInterval));

            let allStations = filteredbVEList.map((f) => f.BTS[0].ds100);
            allStations = allStations.filter((item, index) => allStations.indexOf(item)===index);

            //console.log(filteredbVEList.length);

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
                        if(bveBf[j].BBMNID === "22A8F8B85B68B"){
                            console.log(bveBf[j].G_START + " " + bveBf[j].G_END + " " + bveBf[j].NONSTOP);
                            console.log(calculateDuration(bveBf[j].START, bveBf[j].END, bveBf[j].VTS, bveBf[j].NONSTOP==='Ja')); 
                        }
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

    function checkWeekdays(vts, span){
        //Mo is 64, Di is 32, Mi is 16, ..., So is 1

        if(span.length('days')>6){return true;}
        if(vts===12700){return true;}

        let vtObj = [
            {"Nr" : 0, "Day": "Mo", "Interval" : false, "BVE": false},
            {"Nr" : 1, "Day": "Di", "Interval" : false, "BVE": false},
            {"Nr" : 2, "Day": "Mi", "Interval" : false, "BVE": false},
            {"Nr" : 3, "Day": "Do", "Interval" : false, "BVE": false},
            {"Nr" : 4, "Day": "Fr", "Interval" : false, "BVE": false},
            {"Nr" : 5, "Day": "Sa", "Interval" : false, "BVE": false},
            {"Nr" : 6, "Day": "So", "Interval" : false, "BVE": false}
        ];

        const vt = [64,32,16,8,4,2,1];
        let vtday = vts/100;
        for (let index = 0; index < vt.length; index+=1) {
            if((vtday)-vt[index]>=0){                
                vtday-= vt[index];
                vtObj[vtObj.findIndex((v) => v.Nr === (index))].BVE = true;
            }            
        }
        
        const nr = span.start.weekday-1;
        let ar = Array.from(new Array(Math.ceil(span.length('days'))),(val,index)=> (index+nr));
        for (let index = 0; index < ar.length; index += 1) {
            if(ar[index]>= 7){ar[index]-= 7;}
            vtObj[vtObj.findIndex((v) => v.Nr === ar[index])].Interval = true;
        }


        return(vtObj.filter((v)=> v.Interval===true).some((v)=>v.BVE));      
    };

    function transformVTStoWeekdays(vts){
        let weekdays = [false,false,false,false,false,false,false]
        const vt = [64,32,16,8,4,2,1];
        let vtday = vts/100;
        for (let index = 0; index < vt.length; index+=1) {
            if((vtday)-vt[index]>=0){                
                vtday-= vt[index];
                weekdays[index] = true;   
            }            
        }
        return weekdays;
    };

    function calculateDuration(start, end, vts, nonstop){
        const DateTime = luxon.DateTime;
        const Interval = luxon.Interval;
        if(vts === 127000 || nonstop){return(Interval.fromDateTimes(DateTime.fromMillis(start), DateTime.fromMillis(end)).length('hours').toFixed(2));}
        const dur = Interval.fromDateTimes(DateTime.fromMillis(start), DateTime.fromMillis(end)).length('days');
        return((24*(dur - Math.floor(dur))).toFixed(2));
    };
})();
