$( document ).ready(function(){
   
    var code =[
        '<div id="adminToogle">',
        '<a id="adminToogleLink" href="#adminSideMenu">',
        '<span class="glyphicon glyphicon-cog"></span>',
        '</a>',
        '</div>'
    ]
    $( document.body ).append( code.join('') );
    
    $( "#adminToogleLink" ).sidr({
        name: 'adminSideMenu',
        source: function(){
            $( window.document.getElementById('adminSideMenu') ).html("Hello");
        }
    });
    
});