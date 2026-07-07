<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<html>
<head>
    <title>Holds - Galaxium B2B Agent Console</title>
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
        <td><a href="/console/quotes"><font face="Arial">Quotes</font></a></td>
        <td><a href="/console/audit"><font face="Arial">Audit Trail</font></a></td>
    </tr>
</table>
<hr>
<c:if test="${not empty param.message}">
    <table border="1" cellpadding="4" cellspacing="0" bgcolor="#FFFFCC" width="100%">
        <tr>
            <td><font face="Arial" size="2"><b>Notice:</b> ${param.message}</font></td>
        </tr>
    </table>
    <br>
</c:if>
<font face="Arial" size="4"><b>Holds</b></font>
<table border="1" cellpadding="4" cellspacing="0" bgcolor="#FFFFFF" width="100%">
    <tr bgcolor="#CCCCCC">
        <th><font face="Arial" size="2">Hold ID</font></th>
        <th><font face="Arial" size="2">Quote ID</font></th>
        <th><font face="Arial" size="2">Status</font></th>
        <th><font face="Arial" size="2">Reserved Until</font></th>
        <th><font face="Arial" size="2">Booking Ref</font></th>
        <th><font face="Arial" size="2">Created</font></th>
        <th><font face="Arial" size="2">Action</font></th>
    </tr>
    <c:forEach var="hold" items="${holds}">
        <tr>
            <td><font face="Courier New" size="2"><c:out value="${hold.holdId}"/></font></td>
            <td><font face="Courier New" size="2"><c:out value="${hold.quoteId}"/></font></td>
            <td>
                <c:choose>
                    <c:when test="${hold.status == 'HELD'}">
                        <font face="Arial" size="2" color="#006600"><b><c:out value="${hold.status}"/></b></font>
                    </c:when>
                    <c:when test="${hold.status == 'CONFIRMATION_FAILED'}">
                        <font face="Arial" size="2" color="#CC0000"><b><c:out value="${hold.status}"/></b></font>
                    </c:when>
                    <c:otherwise>
                        <font face="Arial" size="2"><c:out value="${hold.status}"/></font>
                    </c:otherwise>
                </c:choose>
            </td>
            <td><font face="Arial" size="2"><fmt:formatDate value="${hold.reservedUntil}" pattern="yyyy-MM-dd HH:mm:ss"/></font></td>
            <td><font face="Courier New" size="2"><c:out value="${hold.externalBookingReference}"/></font></td>
            <td><font face="Arial" size="2"><fmt:formatDate value="${hold.createdAt}" pattern="yyyy-MM-dd HH:mm:ss"/></font></td>
            <td>
                <c:if test="${hold.status == 'HELD'}">
                    <form method="post" action="/console/holds/${hold.holdId}/release" style="margin:0">
                        <input type="submit" value="Release"
                               onclick="return confirm('Release hold ${hold.holdId}?');">
                    </form>
                </c:if>
            </td>
        </tr>
    </c:forEach>
    <c:if test="${empty holds}">
        <tr>
            <td colspan="7" align="center"><font face="Arial" size="2"><i>No holds on file.</i></font></td>
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
