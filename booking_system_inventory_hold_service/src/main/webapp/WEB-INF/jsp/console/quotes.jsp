<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html>
<head>
    <title>Quotes - Galaxium B2B Agent Console</title>
</head>
<body bgcolor="#EOEOEO">
<table width="100%" border="0" cellpadding="4" cellspacing="0" bgcolor="#000066">
    <tr>
        <td><font color="#FFFFFF" size="5" face="Arial"><b>GALAXIUM TRAVELS &mdash; B2B AGENT CONSOLE</b></font></td>
        <td align="right"><font color="#FFFFFF" size="2" face="Arial">Internal use only</font></td>
    </tr>
</table>
<table border="0" cellpadding="6">
    <tr>
        <td><a href="/console"><font face="Arial">Overview</font></a></td>
        <td><a href="/console/holds"><font face="Arial">Holds</font></a></td>
        <td><a href="/console/audit"><font face="Arial">Audit Trail</font></a></td>
    </tr>
</table>
<hr>
<font face="Arial" size="4"><b>Quotes</b></font>
<table border="1" cellpadding="4" cellspacing="0" bgcolor="#FFFFFF" width="100%">
    <tr bgcolor="#CCCCCC">
        <th><font face="Arial" size="2">Quote ID</font></th>
        <th><font face="Arial" size="2">Flight</font></th>
        <th><font face="Arial" size="2">Class</font></th>
        <th><font face="Arial" size="2">Qty</font></th>
        <th><font face="Arial" size="2">Traveler</font></th>
        <th><font face="Arial" size="2">Total Price</font></th>
        <th><font face="Arial" size="2">Expires</font></th>
    </tr>
    <c:forEach var="quote" items="${quotes}">
        <tr>
            <td><font face="Courier New" size="2"><c:out value="${quote.quoteId}"/></font></td>
            <td align="right"><font face="Arial" size="2"><c:out value="${quote.flightId}"/></font></td>
            <td><font face="Arial" size="2"><c:out value="${quote.seatClass}"/></font></td>
            <td align="right"><font face="Arial" size="2"><c:out value="${quote.quantity}"/></font></td>
            <td><font face="Arial" size="2"><c:out value="${quote.travelerName}"/> (#<c:out value="${quote.travelerId}"/>)</font></td>
            <td align="right"><font face="Courier New" size="2"><fmt:formatNumber value="${quote.totalPrice / 100.0}" pattern="#,##0.00"/> cr</font></td>
            <td><font face="Arial" size="2"><fmt:formatDate value="${quote.expiresAt}" pattern="yyyy-MM-dd HH:mm:ss"/></font></td>
        </tr>
    </c:forEach>
    <c:if test="${empty quotes}">
        <tr>
            <td colspan="7" align="center"><font face="Arial" size="2"><i>No quotes on file.</i></font></td>
        </tr>
    </c:if>
</table>
<hr>
<font face="Arial" size="1" color="#666666">
    Page generated at <%= new java.util.Date() %> &mdash; Galaxium Travels Inventory Hold Service v1.0.0
</font>
</body>
</html>
<%-- Made with Bob --%>
