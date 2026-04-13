package com.governance.evaluation.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

@Entity
@DiscriminatorValue("Organization")
@Data
@EqualsAndHashCode(callSuper = true)
public class OrganizationAdmin extends User {

    @Column(name = "position")
    private String position;

    @Column(name = "grade")
    private String grade;

    @ManyToOne(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    @JoinColumn(name = "organization_id")
    @NotFound(action = NotFoundAction.IGNORE)
    private Organization organization;

}
