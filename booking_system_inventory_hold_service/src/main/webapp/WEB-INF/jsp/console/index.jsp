<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<html>
<head>
    <title>Galaxium B2B Agent Console</title>
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
        <td><a href="/console/holds"><font face="Arial">Holds</font></a></td>
        <td><a href="/console/quotes"><font face="Arial">Quotes</font></a></td>
        <td><a href="/console/audit"><font face="Arial">Audit Trail</font></a></td>
    </tr>
</table>
<hr>
<font face="Arial" size="4"><b>System Overview</b></font>
<table border="1" cellpadding="6" cellspacing="0" bgcolor="#FFFFFF">
    <tr bgcolor="#CCCCCC">
        <th><font face="Arial" size="2">Entity</font></th>
        <th><font face="Arial" size="2">Count</font></th>
    </tr>
    <tr>
        <td><font face="Arial" size="2">Holds</font></td>
        <td align="right"><font face="Arial" size="2"><c:out value="${holdCount}"/></font></td>
    </tr>
    <tr>
        <td><font face="Arial" size="2">Quotes</font></td>
        <td align="right"><font face="Arial" size="2"><c:out value="${quoteCount}"/></font></td>
    </tr>
    <tr>
        <td><font face="Arial" size="2">Audit events</font></td>
        <td align="right"><font face="Arial" size="2"><c:out value="${auditCount}"/></font></td>
    </tr>
</table>
<hr>
<font face="Arial" size="1" color="#666666">
    Page generated at <%= new java.util.Date() %> &mdash; Galaxium Travels Inventory Hold Service v1.0.0
</font>
</body>
</html>
<%-- Made with Bob --%>
