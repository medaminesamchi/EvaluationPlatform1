package com.governance.evaluation.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;

@Entity
@DiscriminatorValue("Organization")
@Data
@EqualsAndHashCode(callSuper = true)
public class Organization extends User {

    @Column(name = "date_of_foundation")
    private LocalDate dateOfFoundation;

    private String sector;
    private String address;
    private String phone;
    private String description;
    private String size;
    private String website;
}