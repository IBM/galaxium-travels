package com.galaxium.holdservice.web;

import com.galaxium.holdservice.repository.AuditEventRepository;
import com.galaxium.holdservice.repository.HoldRepository;
import com.galaxium.holdservice.repository.QuoteRepository;
import com.galaxium.holdservice.service.HoldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

/**
 * Internal agent operations console. Server-rendered JSP pages used by the
 * B2B desk to look up quotes, inspect holds and manually release them when
 * a partner calls in. Not exposed to end customers.
 */
@Controller
@RequestMapping("/console")
public class AgentConsoleController {

    private static final Logger log = LoggerFactory.getLogger(AgentConsoleController.class);

    @Autowired
    private HoldRepository holdRepository;

    @Autowired
    private QuoteRepository quoteRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private HoldService holdService;

    @GetMapping("")
    public String index(Model model) {
        model.addAttribute("holdCount", holdRepository.count());
        model.addAttribute("quoteCount", quoteRepository.count());
        model.addAttribute("auditCount", auditEventRepository.count());
        return "console/index";
    }

    @GetMapping("/holds")
    public String holds(Model model) {
        model.addAttribute("holds", holdRepository.findAll());
        return "console/holds";
    }

    @PostMapping("/holds/{holdId}/release")
    public String releaseHold(@PathVariable("holdId") String holdId) {
        log.info("Console: agent requested release of hold " + holdId);
        String message;
        try {
            holdService.releaseHold(holdId);
            message = "Hold " + holdId + " released.";
        } catch (RuntimeException e) {
            message = "Could not release hold " + holdId + ": " + e.getMessage();
        }
        return "redirect:/console/holds?message=" + urlEncode(message);
    }

    @GetMapping("/quotes")
    public String quotes(Model model) {
        model.addAttribute("quotes", quoteRepository.findAll());
        return "console/quotes";
    }

    @GetMapping("/audit")
    public String audit(Model model) {
        model.addAttribute("events", auditEventRepository.findTop50ByOrderByCreatedAtDesc());
        return "console/audit";
    }

    private String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            return "";
        }
    }
}

// Made with Bob
